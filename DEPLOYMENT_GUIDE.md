# Manim Scene Editor - Cloudflare Pages 배포 가이드

이 문서는 Manim Scene Editor를 Cloudflare Pages에 배포하는 과정을 안내합니다.

## 📋 배포 구조

1. **프론트엔드** (React + Vite) → **Cloudflare Pages**
2. **백엔드 API** (Hono) → Cloudflare Workers  
3. **렌더링 서버** (Python) → 별도 서버 (Railway, Render.com 등)

---

## 🚀 1단계: Cloudflare Pages 배포

### 1-1. Git 저장소 준비

```bash
cd my-app
git init
git add .
git commit -m "Initial commit for Cloudflare Pages"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 1-2. Cloudflare Pages 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. **Pages** → **Create a project** → **Connect to Git**
3. GitHub 저장소 선택 후 다음 설정 입력:

#### ⚙️ Build Settings

| 항목 | 값 |
|------|-----|
| **Framework preset** | `Vite` |
| **Build command** | `pnpm install && pnpm run build` |
| **Build output directory** | `ui/dist` |
| **Root directory** | `/` (비워두거나 `/` 입력) |

#### 🔐 Environment Variables

프로덕션 환경 변수 추가:

- **VITE_BACKEND_API_URL**: `https://your-worker-name.your-subdomain.workers.dev`
  (백엔드 Worker 배포 후 URL 입력)

### 1-3. 커스텀 도메인 연결 (선택사항)

1. Pages 프로젝트 → **Custom domains** → **Set up a custom domain**
2. 도메인 입력 (예: `hotitemtoday.com`)
3. DNS 설정 안내에 따라 CNAME 레코드 추가

---

## 🔧 2단계: 백엔드 API 배포 (Cloudflare Workers)

### 2-1. Wrangler 설치 및 로그인

```bash
npm install -g wrangler
wrangler login
```

### 2-2. 환경 변수 설정

```bash
cd server

# 필수 환경 변수 설정
wrangler secret put CLAUDE_API_KEY
wrangler secret put DATABASE_URL
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put FIREBASE_CLIENT_EMAIL
```

### 2-3. Worker 배포

```bash
cd server
pnpm install
pnpm run deploy
```

배포 완료 후 Worker URL을 복사하여 Cloudflare Pages 환경 변수(`VITE_BACKEND_API_URL`)에 설정하세요.

### ⚠️ Python 렌더링 제한사항

Cloudflare Workers는 Python을 실행할 수 없으므로, **렌더링 서버를 별도로 배포**해야 합니다 (3단계 참조).

---

## 🐍 3단계: Python 렌더링 서버 배포 (선택사항)

Manim 비디오 렌더링 기능을 사용하려면 Python 서버를 별도로 배포해야 합니다.

### 3-1. Railway 배포 (권장)

1. [Railway](https://railway.app) 접속 → **New Project** → **Deploy from GitHub repo**
2. 저장소 선택 후 `render-server` 디렉토리 지정
3. **Settings** → **Generate Domain** → URL 복사 (예: `manim-renderer.railway.app`)
4. **Variables**에 `PYTHON_VERSION=3.11` 추가

### 3-2. 백엔드 환경 변수 추가

렌더링 서버 배포 후 백엔드에 URL 설정:

```bash
cd server
wrangler secret put RENDER_SERVER_URL
# 예: https://manim-renderer.railway.app
```

### 3-3. 대안: Render.com

1. [Render](https://render.com) → **New Web Service**
2. 설정:
   - **Root Directory**: `render-server`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`

---

## 💾 4단계: 데이터베이스 & Firebase 설정

### 4-1. 데이터베이스 (Neon 권장)

1. [Neon](https://neon.tech) 또는 [Supabase](https://supabase.com)에서 프로젝트 생성
2. Connection String 복사
3. 백엔드에 환경 변수 설정:
   ```bash
   cd server
   wrangler secret put DATABASE_URL
   ```

### 4-2. Firebase 인증

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. **Authentication** → **Google** 활성화
3. **Service Account** 키 생성 후 환경 변수 설정:
   ```bash
   wrangler secret put FIREBASE_PROJECT_ID
   wrangler secret put FIREBASE_PRIVATE_KEY
   wrangler secret put FIREBASE_CLIENT_EMAIL
   ```
4. **Authorized domains**에 배포 도메인 추가

---

## ✅ 배포 체크리스트

- [ ] **1단계**: Cloudflare Pages 배포 완료
- [ ] **2단계**: Cloudflare Workers 배포 완료
- [ ] **3단계**: Python 렌더링 서버 배포 (선택)
- [ ] **4단계**: 데이터베이스 & Firebase 설정 완료
- [ ] **환경 변수**: 모든 환경 변수 설정 확인
- [ ] **테스트**: 프론트엔드 접속 및 기능 테스트

---

## 📝 환경 변수 요약

### Cloudflare Pages
- `VITE_BACKEND_API_URL` → Worker URL

### Cloudflare Workers
- `CLAUDE_API_KEY` → Claude API 키
- `DATABASE_URL` → Neon/Supabase URL
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- `RENDER_SERVER_URL` → 렌더링 서버 URL (선택)

---

## 🔗 참고 링크

- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Railway 문서](https://docs.railway.app/)
- [Neon 문서](https://neon.tech/docs)

