#!/usr/bin/env python3
"""
간단한 Manim 렌더링 스크립트
Manim 코드를 받아서 비디오로 렌더링
"""
import sys
import json
import tempfile
import uuid
import subprocess
import re
import shutil
from pathlib import Path


def _new_media_dir():
    """임시 미디어 디렉토리 생성"""
    d = Path(tempfile.gettempdir()) / f"manim_job_{uuid.uuid4().hex}"
    (d / "media").mkdir(parents=True, exist_ok=True)
    return d / "media"


def _find_final_mp4(media_dir: Path, std: str):
    """출력에서 최종 mp4 파일 경로 찾기"""
    # stdout/stderr에서 "File ready at ..." 문구 찾기
    m = re.search(r"File ready at\s+(.*?\.mp4)", std, flags=re.IGNORECASE)
    if m:
        p = Path(m.group(1)).resolve()
        if p.exists():
            return p
    # 폴백: media/videos 아래 최신 mp4 검색
    candidates = list((media_dir / "videos").glob("**/*.mp4"))
    if candidates:
        return max(candidates, key=lambda p: p.stat().st_mtime)
    return None


def _get_manim_command():
    """manim 명령어를 찾아서 반환"""
    # 먼저 py -m manim 시도 (Windows에서 더 안정적)
    try:
        result = subprocess.run(
            [sys.executable, "-m", "manim", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return [sys.executable, "-m", "manim"]
    except:
        pass
    
    # 폴백: manim 직접 호출
    return ["manim"]


def render_manim(manim_code: str, dest_path: str):
    """Manim 코드를 렌더링하여 비디오 파일 생성"""
    # 임시 입력 파일 생성
    tmp_dir = Path(tempfile.gettempdir())
    input_file = tmp_dir / f"manim_input_{uuid.uuid4().hex}.py"
    input_file.write_text(manim_code, encoding="utf-8")
    
    # 출력 파일 경로 설정
    output_file = Path(dest_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 임시 미디어 디렉토리 생성
    media_dir = _new_media_dir()
    out_stem = output_file.stem
    
    # manim 명령어 가져오기
    manim_cmd = _get_manim_command()
    
    # Manim 실행
    cmd = manim_cmd + [
        str(input_file), "-qm",
        "--media_dir", str(media_dir),
        "--output_file", out_stem,
        "--write_to_movie",
    ]
    
    print(f"[DEBUG] Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    std = (result.stdout or "") + "\n" + (result.stderr or "")
    
    # 생성된 비디오 파일 찾기
    final_mp4 = _find_final_mp4(media_dir, std)
    
    if result.returncode == 0 and final_mp4 and final_mp4.exists():
        # 최종 위치로 복사
        shutil.copy2(final_mp4, output_file)
        # partial_movie_files 정리
        pmf = final_mp4.parent.parent / "partial_movie_files"
        if pmf.exists():
            shutil.rmtree(pmf, ignore_errors=True)
        return {"ok": True, "video_relpath": str(output_file)}
    else:
        return {"ok": False, "error": std}


def merge_videos(video_paths: list, output_path: str):
    """여러 비디오를 하나로 병합 (ffmpeg 사용)"""
    try:
        # ffmpeg가 설치되어 있는지 확인
        check_cmd = ["ffmpeg", "-version"]
        subprocess.run(check_cmd, capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {"ok": False, "error": "ffmpeg가 설치되어 있지 않습니다"}
    
    # 입력 파일 확인
    for path in video_paths:
        if not Path(path).exists():
            return {"ok": False, "error": f"파일을 찾을 수 없습니다: {path}"}
    
    # 임시 파일 목록 생성
    tmp_dir = Path(tempfile.gettempdir())
    list_file = tmp_dir / f"concat_list_{uuid.uuid4().hex}.txt"
    
    # concat 목록 파일 작성 (ffmpeg concat 형식)
    with open(list_file, 'w', encoding='utf-8') as f:
        for video_path in video_paths:
            # Windows 경로를 ffmpeg가 인식할 수 있도록 변환
            abs_path = Path(video_path).resolve()
            # ffmpeg concat에서 사용하기 위해 작은따옴표로 감싸고 이스케이프
            f.write(f"file '{str(abs_path).replace(chr(92), '/')}'\n")
    
    # 출력 파일 경로 설정
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # ffmpeg 명령어 실행
    cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", str(list_file),
        "-c", "copy",  # 재인코딩 없이 복사 (빠름)
        "-y",  # 덮어쓰기
        str(output_file)
    ]
    
    print(f"[DEBUG] Merging videos: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # 임시 파일 삭제
    list_file.unlink(missing_ok=True)
    
    if result.returncode == 0 and output_file.exists():
        return {"ok": True, "video_relpath": str(output_file)}
    else:
        error_msg = result.stderr or result.stdout or "Unknown error"
        return {"ok": False, "error": error_msg}


def main():
    """메인 함수 - JSON 입력을 받아서 렌더링"""
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
        code = payload.get("code", "")
        dest_path = payload.get("dest_path")
    except json.JSONDecodeError:
        code = raw
        dest_path = None
    
    if not code:
        print(json.dumps({"ok": False, "error": "No code provided"}))
        sys.exit(1)
    
    if not dest_path:
        print(json.dumps({"ok": False, "error": "No dest_path provided"}))
        sys.exit(1)
    
    result = render_manim(code, dest_path)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

