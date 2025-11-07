# 빠른 배포 시작 가이드

## 🚀 5분 안에 배포 시작하기

### 필수 준비사항
1. Cloudflare 계정
2. GitHub 계정
3. Claude API 키
4. 도메인 `hotitemtoday.com` (또는 다른 도메인)

---

## 📝 단계별 배포

### 1️⃣ 코드를 GitHub에 푸시

```bash
cd my-app
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2️⃣ Cloudflare Pages에 프론트엔드 배포

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. GitHub 저장소 연결
3. 설정:
   - **Build command**: `cd ui && pnpm install && pnpm run build`
   - **Build output directory**: `ui/dist`
4. **Save and Deploy**

### 3️⃣ Cloudflare Workers에 백엔드 배포

```bash
# Wrangler 설치 및 로그인
npm install -g wrangler
wrangler login

# Worker 디렉토리로 이동
cd my-app/server

# 환경 변수 설정
wrangler secret put CLAUDE_API_KEY
wrangler secret put DATABASE_URL
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put FIREBASE_CLIENT_EMAIL

# 배포
pnpm install
wrangler deploy
```

### 4️⃣ 프론트엔드 환경 변수 업데이트

1. Cloudflare Pages → **Settings** → **Environment variables**
2. `VITE_BACKEND_API_URL` 추가 (Worker URL)
3. **Save** → 재배포

### 5️⃣ 도메인 연결

1. Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. `hotitemtoday.com` 입력
3. DNS 레코드 추가 (안내에 따라)
4. SSL 인증서 자동 생성 대기

---

## 🐍 렌더링 서버 배포 (선택사항)

### Railway 사용 (권장)

1. [Railway](https://railway.app) 접속 및 로그인
2. **New Project** → **Deploy from GitHub repo**
3. 저장소 선택 → **Root Directory**: `render-server`
4. **Settings** → **Generate Domain**
5. 배포 완료 후 URL을 백엔드 Worker 환경 변수에 추가:
   ```bash
   wrangler secret put RENDER_SERVER_URL
   ```

---

## ✅ 배포 확인

1. **프론트엔드**: `https://hotitemtoday.com` 접속
2. **백엔드**: `https://your-worker.workers.dev/` 접속 → `{"status":"ok"}`
3. **기능 테스트**: Scene 생성, 편집, 렌더링 테스트

---

## 📚 상세 가이드

- **전체 배포 가이드**: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)
- **체크리스트**: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

---

## 🆘 문제 발생 시

1. **빌드 실패**: 로그 확인 → 의존성 문제 확인
2. **CORS 오류**: 백엔드 CORS 설정 확인
3. **환경 변수 오류**: Secret 설정 확인
4. **도메인 연결 실패**: DNS 설정 확인

자세한 문제 해결은 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)의 "문제 해결" 섹션 참고.

