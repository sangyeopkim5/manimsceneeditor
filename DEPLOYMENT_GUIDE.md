# Manim Scene Editor 배포 가이드

이 문서는 Manim Scene Editor를 `hotitemtoday.com` 도메인으로 배포하는 전체 과정을 안내합니다.

## 📋 배포 구조 개요

Manim Scene Editor는 3개의 주요 컴포넌트로 구성됩니다:

1. **프론트엔드** (React + Vite) → Cloudflare Pages
2. **백엔드 API** (Hono) → Cloudflare Workers  
3. **렌더링 서버** (Python) → 별도 서버 필요 (Railway, Render.com 등)

## 🎯 배포 목표

- 외부 사용자가 `hotitemtoday.com`으로 접속
- 웹 브라우저에서 Scene 편집, 렌더, 업로드 기능 사용 가능
- 모든 기능이 정상 작동

---

## 1️⃣ 프론트엔드 배포 (Cloudflare Pages)

### 1-1. 준비 작업

1. **Git 저장소 준비**
   ```bash
   cd my-app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **환경 변수 파일 생성**
   `my-app/ui/.env.production` 파일 생성:
   ```env
   VITE_BACKEND_API_URL=https://your-worker-name.your-subdomain.workers.dev
   ```

### 1-2. Cloudflare Pages 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. **Pages** → **Create a project** → **Connect to Git**
3. GitHub 저장소 선택
4. **Build settings**:
   - **Framework preset**: Vite
   - **Build command**: `cd ui && pnpm install && pnpm run build`
   - **Build output directory**: `ui/dist`
   - **Root directory**: `/` (프로젝트 루트)
5. **Environment variables** 추가:
   - `VITE_BACKEND_API_URL`: 백엔드 Worker URL (나중에 설정)

### 1-3. 커스텀 도메인 연결

1. Pages 프로젝트 → **Custom domains**
2. **Set up a custom domain** 클릭
3. `hotitemtoday.com` 입력
4. DNS 설정 안내에 따라 도메인 DNS 레코드 추가

---

## 2️⃣ 백엔드 API 배포 (Cloudflare Workers)

### 2-1. Wrangler CLI 설치 및 로그인

```bash
npm install -g wrangler
wrangler login
```

### 2-2. Worker 설정 파일 생성

`my-app/server/wrangler.toml` 파일 생성 (템플릿 기반):

```toml
name = "manim-scene-editor-api"
main = "src/api.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
RUNTIME = "cloudflare"

# 환경 변수는 wrangler secret 명령어로 설정
# wrangler secret put CLAUDE_API_KEY
# wrangler secret put DATABASE_URL
# wrangler secret put FIREBASE_PROJECT_ID
# wrangler secret put FIREBASE_PRIVATE_KEY
# wrangler secret put FIREBASE_CLIENT_EMAIL
```

### 2-3. 환경 변수 설정

```bash
cd my-app/server

# Claude API 키
wrangler secret put CLAUDE_API_KEY

# 데이터베이스 URL (Neon, Supabase 등)
wrangler secret put DATABASE_URL

# Firebase 설정 (프로덕션)
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put FIREBASE_CLIENT_EMAIL
```

### 2-4. 배포

```bash
cd my-app/server
pnpm install
pnpm run deploy
```

### ⚠️ 중요: Python 렌더링 제한사항

Cloudflare Workers는 **Python을 직접 실행할 수 없습니다**. 따라서:

**옵션 A: 외부 렌더링 서버 사용 (권장)**
- Python 렌더링 서버를 별도로 배포 (Railway, Render.com 등)
- 백엔드 API에서 외부 서버로 HTTP 요청 전송
- `server/src/lib/render.ts` 수정 필요

**옵션 B: 렌더링 기능 비활성화**
- 프로덕션에서는 렌더링 기능 제거 또는 제한
- 코드 생성 및 편집 기능만 제공

---

## 3️⃣ Python 렌더링 서버 배포

### 3-1. Railway 배포 (권장)

1. [Railway](https://railway.app) 접속 및 로그인
2. **New Project** → **Deploy from GitHub repo**
3. 저장소 선택 후 `render-server` 디렉토리 선택
4. **Settings** → **Generate Domain** (예: `manim-renderer.railway.app`)
5. **Variables** 추가:
   - `PYTHON_VERSION`: `3.11`
   - 기타 필요한 환경 변수

6. **railway.json** 생성 (`my-app/render-server/railway.json`):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python render.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

7. **requirements.txt** 확인:
```txt
manim
ffmpeg-python
```

### 3-2. Render.com 배포 (대안)

1. [Render](https://render.com) 접속 및 로그인
2. **New** → **Web Service**
3. GitHub 저장소 연결
4. 설정:
   - **Name**: `manim-renderer`
   - **Root Directory**: `render-server`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python render.py` (또는 FastAPI/Flask 서버로 래핑)

### 3-3. 렌더링 서버를 HTTP API로 변환

현재 `render.py`는 stdin으로 입력을 받지만, 배포를 위해 HTTP API로 변환 필요:

**`my-app/render-server/server.py`** 생성:
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from render import render_manim, merge_videos
import uvicorn

app = FastAPI()

class RenderRequest(BaseModel):
    code: str
    dest_path: str = None

class MergeRequest(BaseModel):
    video_paths: list
    output_path: str

@app.post("/render")
async def render(request: RenderRequest):
    result = render_manim(request.code, request.dest_path or f"/tmp/{uuid.uuid4()}.mp4")
    return result

@app.post("/merge")
async def merge(request: MergeRequest):
    result = merge_videos(request.video_paths, request.output_path)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3-4. 백엔드에서 외부 렌더링 서버 호출

`my-app/server/src/lib/render.ts` 수정 필요:

```typescript
// 외부 렌더링 서버 URL (환경 변수)
const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || 'http://localhost:8000';

export async function renderManim(
  manimCode: string
): Promise<{ success: boolean; videoUrl: string | null; error?: string }> {
  try {
    const response = await fetch(`${RENDER_SERVER_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: manimCode })
    });
    
    const result = await response.json();
    // 비디오를 Cloudflare R2 또는 다른 스토리지에 업로드
    // URL 반환
    return result;
  } catch (error) {
    return { success: false, videoUrl: null, error: error.message };
  }
}
```

---

## 4️⃣ 데이터베이스 설정

### 4-1. Neon 또는 Supabase 사용

1. [Neon](https://neon.tech) 또는 [Supabase](https://supabase.com) 계정 생성
2. 새 프로젝트 생성
3. Connection string 복사
4. Cloudflare Worker 환경 변수에 `DATABASE_URL` 설정

### 4-2. 데이터베이스 마이그레이션

```bash
cd my-app/server
pnpm run db:push
```

---

## 5️⃣ Firebase 인증 설정

### 5-1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 새 프로젝트 생성
3. **Authentication** → **Sign-in method** → **Google** 활성화
4. **Project settings** → **Service accounts** → **Generate new private key**
5. 다운로드한 JSON 파일의 내용을 환경 변수로 설정:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

### 5-2. Authorized domains 추가

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. 다음 도메인 추가:
   - `hotitemtoday.com`
   - `*.pages.dev` (Cloudflare Pages 기본 도메인)

---

## 6️⃣ 환경 변수 정리

### 프론트엔드 (Cloudflare Pages)
- `VITE_BACKEND_API_URL`: 백엔드 Worker URL

### 백엔드 (Cloudflare Workers)
- `CLAUDE_API_KEY`: Anthropic Claude API 키
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID
- `FIREBASE_PRIVATE_KEY`: Firebase 서비스 계정 개인 키
- `FIREBASE_CLIENT_EMAIL`: Firebase 서비스 계정 이메일
- `RENDER_SERVER_URL`: Python 렌더링 서버 URL (옵션)

### 렌더링 서버 (Railway/Render)
- `PYTHON_VERSION`: `3.11`
- 기타 필요한 환경 변수

---

## 7️⃣ 배포 체크리스트

- [ ] Git 저장소에 코드 푸시 완료
- [ ] Cloudflare Pages에 프론트엔드 배포 완료
- [ ] Cloudflare Workers에 백엔드 API 배포 완료
- [ ] Python 렌더링 서버 배포 완료 (또는 비활성화)
- [ ] 데이터베이스 연결 설정 완료
- [ ] Firebase 인증 설정 완료
- [ ] 모든 환경 변수 설정 완료
- [ ] 도메인 연결 완료 (`hotitemtoday.com`)
- [ ] CORS 설정 확인
- [ ] 각 서비스 간 통신 테스트

---

## 8️⃣ 배포 후 테스트

1. **프론트엔드 접속**: `https://hotitemtoday.com`
2. **API 헬스 체크**: `https://your-worker.workers.dev/`
3. **Scene 생성 테스트**
4. **렌더링 테스트** (렌더링 서버 배포 시)
5. **인증 테스트** (Google Sign-In)

---

## 9️⃣ 문제 해결

### CORS 오류
- Cloudflare Workers의 CORS 미들웨어 확인
- Firebase Authorized domains 확인

### 렌더링 실패
- Python 렌더링 서버 로그 확인
- Manim 및 ffmpeg 설치 확인
- 타임아웃 설정 확인

### 데이터베이스 연결 실패
- `DATABASE_URL` 환경 변수 확인
- 데이터베이스 방화벽 설정 확인 (Neon/Supabase)

---

## 🔗 유용한 링크

- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Railway 문서](https://docs.railway.app/)
- [Render 문서](https://render.com/docs)
- [Neon 문서](https://neon.tech/docs)
- [Supabase 문서](https://supabase.com/docs)

