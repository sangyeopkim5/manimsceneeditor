# Manim Render Script

Manim Scene 렌더링을 위한 간단한 Python 스크립트입니다.

## 설치

```bash
pip install manim
```

## 사용 방법

백엔드에서 자동으로 실행됩니다. 별도로 실행할 필요가 없습니다.

## 구조

- `render.py`: Manim 코드를 받아서 비디오로 렌더링하는 메인 스크립트

## 비디오 파일 저장 위치

렌더링된 비디오 파일은 `../public/media/video/` 디렉토리에 저장됩니다.
백엔드가 `http://localhost:8787/api/v1/media/video/{job_id}.mp4`로 비디오를 서빙합니다.
