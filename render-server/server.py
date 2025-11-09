#!/usr/bin/env python3
"""
Manim 렌더링 서버 (HTTP API)
FastAPI를 사용하여 HTTP 엔드포인트 제공
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from render import render_manim, merge_videos
import uvicorn
import uuid
from pathlib import Path
import os

app = FastAPI(title="Manim Render Server", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 비디오 저장 디렉토리
VIDEO_DIR = Path("/tmp/manim-videos")
VIDEO_DIR.mkdir(parents=True, exist_ok=True)


class RenderRequest(BaseModel):
    code: str
    dest_path: str = None


class MergeRequest(BaseModel):
    video_paths: list
    output_path: str = None


@app.get("/")
async def root():
    return {"status": "ok", "message": "Manim Render Server is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/render")
async def render(request: RenderRequest):
    """Manim 코드를 렌더링하여 비디오 생성"""
    try:
        # dest_path가 없으면 자동 생성
        if not request.dest_path:
            video_filename = f"{uuid.uuid4().hex}.mp4"
            request.dest_path = str(VIDEO_DIR / video_filename)
        
        # 렌더링 실행
        print(f"[server.py] Starting render with code length: {len(request.code)}")
        result = render_manim(request.code, request.dest_path)
        print(f"[server.py] Render result: {result}")
        
        if result.get("ok"):
            # 비디오 파일 경로를 URL로 변환
            video_path = Path(result.get("video_relpath", request.dest_path))
            video_url = f"/video/{video_path.name}"
            
            print(f"[server.py] Render successful! Video URL: {video_url}")
            return {
                "success": True,
                "videoUrl": video_url,
                "videoPath": str(video_path),
                "message": "렌더링 성공"
            }
        else:
            error_msg = result.get("error", "렌더링 실패")
            print(f"[server.py] Render failed! Error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
            
    except Exception as e:
        print(f"[server.py] Exception in render: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"렌더링 오류: {str(e)}"
        )


@app.post("/merge")
async def merge(request: MergeRequest):
    """여러 비디오를 하나로 병합"""
    try:
        # output_path가 없으면 자동 생성
        if not request.output_path:
            output_filename = f"merged_{uuid.uuid4().hex}.mp4"
            request.output_path = str(VIDEO_DIR / output_filename)
        
        # 병합 실행
        result = merge_videos(request.video_paths, request.output_path)
        
        if result.get("ok"):
            video_path = Path(result.get("video_relpath", request.output_path))
            video_url = f"/video/{video_path.name}"
            
            return {
                "success": True,
                "videoUrl": video_url,
                "videoPath": str(video_path),
                "message": "병합 성공"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "병합 실패")
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"병합 오류: {str(e)}"
        )


@app.get("/video/{filename}")
async def get_video(filename: str):
    """렌더링된 비디오 파일 서빙"""
    video_path = VIDEO_DIR / filename
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="비디오 파일을 찾을 수 없습니다")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=filename
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

