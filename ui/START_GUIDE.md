# Manim Scene Editor 시작 가이드

## 전체 구조

1. **로컬 Python 서버** (`manion-vastai`): Manim 렌더링 담당
2. **프론트엔드** (`Manim Scene Editing UI`): 웹 UI 및 코드 생성

## 시작 방법

### 1단계: 로컬 Python 렌더링 서버 실행

#### 1-1. 의존성 설치 (처음 한 번만)
```bash
cd C:\Users\PC\Desktop\manion-vastai
pip install -r requirements.txt
```

#### 1-2. 환경 변수 설정
`manion-vastai` 폴더에 `.env` 파일 생성:
```env
SUPABASE_PROJECT_URL=https://nnfrllibxkjgbshuzcjj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
BUCKET_MANIM_VIDEOS=manim-videos
```

#### 1-3. 서버 실행
```bash
cd C:\Users\PC\Desktop\manion-vastai
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

서버가 실행되면:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2단계: 프론트엔드 실행

#### 2-1. 의존성 설치 (처음 한 번만)
```bash
cd "C:\Users\PC\Downloads\Manim Scene Editing UI (4)"
npm install
```

#### 2-2. (선택) 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성 (로컬 서버 URL이 다르면):
```env
VITE_LOCAL_RENDER_SERVER_URL=http://localhost:8000
```

#### 2-3. 개발 서버 실행
```bash
npm run dev
```

브라우저가 자동으로 열리고 `http://localhost:3000`에서 실행됩니다.

## 사용 순서

1. **API 키 설정**: 처음 실행 시 Claude API 키 입력
2. **Scene 생성**: 초기 프롬프트 입력 (예: "피타고라스 정리 증명")
3. **코드 수정**: Scene별로 자연어로 코드 수정
4. **렌더링**: 
   - "Scene 미리보기": 현재 선택된 Scene 렌더링
   - "전체 렌더링": 모든 Scene 통합 렌더링
5. **영상 내보내기**: 렌더링된 영상 다운로드

## 문제 해결

### 로컬 서버 연결 오류
- Python 서버가 `http://localhost:8000`에서 실행 중인지 확인
- 브라우저 콘솔에서 CORS 오류 확인
- `.env` 파일의 `VITE_LOCAL_RENDER_SERVER_URL` 확인

### 렌더링 실패
- Python 서버 로그 확인
- Manim 설치 확인: `manim --version`
- GPU 메모리 부족 시 Qwen 모델 로딩 실패 가능

### Supabase Storage 오류
- `.env` 파일의 Supabase 설정 확인
- Storage 버킷(`manim-videos`) 생성 확인

## 포트 정보

- **프론트엔드**: `http://localhost:3000`
- **로컬 렌더링 서버**: `http://localhost:8000`
- **Supabase Edge Functions**: `https://nnfrllibxkjgbshuzcjj.supabase.co/functions/v1/make-server-36e21242`

