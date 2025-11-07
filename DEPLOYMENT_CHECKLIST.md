# 배포 체크리스트

## 🎯 목표
Manim Scene Editor를 `hotitemtoday.com` 도메인으로 배포하여 외부 사용자가 접근 가능하게 만들기

---

## ✅ 사전 준비

### 1. 계정 및 서비스 준비
- [ ] Cloudflare 계정 생성 및 로그인
- [ ] GitHub 계정 및 저장소 준비
- [ ] Railway 또는 Render.com 계정 생성 (렌더링 서버용)
- [ ] Neon 또는 Supabase 계정 생성 (데이터베이스용)
- [ ] Firebase 프로젝트 생성 (인증용)
- [ ] 도메인 `hotitemtoday.com` 소유 확인

### 2. API 키 및 인증 정보 준비
- [ ] Claude API 키 (Anthropic)
- [ ] Firebase 서비스 계정 키
- [ ] 데이터베이스 연결 문자열

---

## 📦 1단계: 코드 준비

### Git 저장소 설정
- [ ] `my-app` 디렉토리에서 Git 초기화
- [ ] `.gitignore` 파일 확인 (node_modules, .env 등 제외)
- [ ] GitHub에 저장소 생성 및 연결
- [ ] 코드 커밋 및 푸시

### 환경 변수 파일 생성
- [ ] `my-app/ui/.env.production` 생성 (프론트엔드용)
- [ ] `my-app/server/.env` 생성 (로컬 개발용, Git에 커밋하지 않음)
- [ ] `my-app/render-server/.env` 생성 (로컬 개발용)

---

## 🎨 2단계: 프론트엔드 배포 (Cloudflare Pages)

### Cloudflare Pages 설정
- [ ] Cloudflare Dashboard → Pages → Create a project
- [ ] GitHub 저장소 연결
- [ ] 프로젝트 이름: `manim-scene-editor` (또는 원하는 이름)
- [ ] Build settings:
  - Framework preset: Vite
  - Build command: `cd ui && pnpm install && pnpm run build`
  - Build output directory: `ui/dist`
  - Root directory: `/`
- [ ] Environment variables 추가:
  - `VITE_BACKEND_API_URL`: 백엔드 Worker URL (나중에 설정)

### 빌드 및 배포
- [ ] 첫 배포 실행 및 성공 확인
- [ ] 배포된 URL 확인 (예: `manim-scene-editor.pages.dev`)

### 커스텀 도메인 연결
- [ ] Pages 프로젝트 → Custom domains → Set up a custom domain
- [ ] `hotitemtoday.com` 입력
- [ ] DNS 레코드 추가 (Cloudflare 안내에 따라)
- [ ] SSL 인증서 자동 생성 대기
- [ ] `https://hotitemtoday.com` 접속 테스트

---

## ⚙️ 3단계: 백엔드 API 배포 (Cloudflare Workers)

### Wrangler CLI 설정
- [ ] Wrangler CLI 설치: `npm install -g wrangler`
- [ ] Wrangler 로그인: `wrangler login`

### Worker 설정
- [ ] `my-app/server/wrangler.toml` 파일 확인
- [ ] Worker 이름 확인: `manim-scene-editor-api`

### 환경 변수 설정 (Secret)
```bash
cd my-app/server
wrangler secret put CLAUDE_API_KEY
wrangler secret put DATABASE_URL
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put FIREBASE_CLIENT_EMAIL
# 렌더링 서버 사용 시:
wrangler secret put RENDER_SERVER_URL
```

- [ ] 모든 환경 변수 설정 완료

### 배포
- [ ] `cd my-app/server`
- [ ] `pnpm install` (의존성 설치)
- [ ] `pnpm run deploy` 또는 `wrangler deploy`
- [ ] 배포 성공 확인
- [ ] Worker URL 확인 (예: `manim-scene-editor-api.your-subdomain.workers.dev`)

### API 테스트
- [ ] `https://your-worker.workers.dev/` 접속 → `{"status":"ok"}`
- [ ] `https://your-worker.workers.dev/api/v1/hello` 접속 → 응답 확인

### 프론트엔드 환경 변수 업데이트
- [ ] Cloudflare Pages → Environment variables
- [ ] `VITE_BACKEND_API_URL` 업데이트 (Worker URL로)
- [ ] 재배포 트리거

---

## 🐍 4단계: Python 렌더링 서버 배포

### 옵션 A: Railway 배포 (권장)

#### Railway 프로젝트 생성
- [ ] Railway 계정 로그인
- [ ] New Project → Deploy from GitHub repo
- [ ] 저장소 선택
- [ ] Root Directory: `render-server`

#### 설정
- [ ] Settings → Generate Domain
- [ ] Variables 추가:
  - `PYTHON_VERSION`: `3.11`
- [ ] `railway.json` 파일 확인

#### 배포
- [ ] 자동 배포 시작
- [ ] 배포 로그 확인
- [ ] 배포된 URL 확인 (예: `manim-renderer.railway.app`)

#### 테스트
- [ ] `https://your-render-server.railway.app/health` 접속
- [ ] 렌더링 API 테스트

### 옵션 B: Render.com 배포

#### Render 프로젝트 생성
- [ ] Render 계정 로그인
- [ ] New → Web Service
- [ ] GitHub 저장소 연결
- [ ] Root Directory: `render-server`

#### 설정
- [ ] Name: `manim-renderer`
- [ ] Environment: `Python 3`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `python server.py`

#### 배포
- [ ] Create Web Service
- [ ] 배포 완료 대기
- [ ] 배포된 URL 확인

### 옵션 C: Docker 배포 (다른 플랫폼)

- [ ] `Dockerfile` 확인
- [ ] Docker 이미지 빌드
- [ ] 컨테이너 레지스트리에 푸시
- [ ] 호스팅 플랫폼에 배포

### 백엔드 Worker에 렌더링 서버 URL 설정
- [ ] 렌더링 서버 URL 확인
- [ ] `wrangler secret put RENDER_SERVER_URL` 실행
- [ ] Worker 재배포 (필요 시)

---

## 🗄️ 5단계: 데이터베이스 설정

### Neon 또는 Supabase 설정
- [ ] 프로젝트 생성
- [ ] 데이터베이스 생성
- [ ] Connection string 복사

### 데이터베이스 마이그레이션
- [ ] `cd my-app/server`
- [ ] `pnpm run db:push` 실행
- [ ] 스키마 생성 확인

### Worker 환경 변수 설정
- [ ] `wrangler secret put DATABASE_URL` 실행
- [ ] 연결 테스트

---

## 🔐 6단계: Firebase 인증 설정

### Firebase 프로젝트 설정
- [ ] Firebase Console 접속
- [ ] 프로젝트 생성 또는 기존 프로젝트 선택
- [ ] Authentication → Sign-in method → Google 활성화
- [ ] Project settings → Service accounts → Generate new private key
- [ ] JSON 파일 다운로드

### Firebase 환경 변수 추출
- [ ] JSON 파일에서 다음 값 추출:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `private_key` → `FIREBASE_PRIVATE_KEY`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Worker 환경 변수 설정
- [ ] `wrangler secret put FIREBASE_PROJECT_ID`
- [ ] `wrangler secret put FIREBASE_PRIVATE_KEY`
- [ ] `wrangler secret put FIREBASE_CLIENT_EMAIL`

### Authorized Domains 설정
- [ ] Firebase Console → Authentication → Settings → Authorized domains
- [ ] 다음 도메인 추가:
  - `hotitemtoday.com`
  - `*.pages.dev` (Cloudflare Pages 기본 도메인)
  - `localhost` (개발용)

---

## 🔗 7단계: 서비스 간 연결 확인

### 프론트엔드 → 백엔드
- [ ] 브라우저 개발자 도구 → Network 탭
- [ ] API 호출 확인
- [ ] CORS 오류 확인 (없어야 함)

### 백엔드 → 데이터베이스
- [ ] Worker 로그 확인
- [ ] 데이터베이스 연결 테스트

### 백엔드 → 렌더링 서버 (렌더링 서버 배포 시)
- [ ] 렌더링 요청 테스트
- [ ] 응답 확인

### 백엔드 → Firebase
- [ ] 인증 요청 테스트
- [ ] 토큰 검증 확인

---

## 🧪 8단계: 전체 기능 테스트

### 기본 기능
- [ ] `https://hotitemtoday.com` 접속
- [ ] 페이지 로드 확인
- [ ] 초기 프롬프트 입력
- [ ] Scene 생성 확인

### 인증 기능
- [ ] Google Sign-In 버튼 클릭
- [ ] 로그인 완료 확인
- [ ] 사용자 정보 표시 확인

### Scene 편집 기능
- [ ] Scene 코드 수정
- [ ] 변경사항 저장 확인

### 렌더링 기능 (렌더링 서버 배포 시)
- [ ] Scene 미리보기 렌더링
- [ ] 전체 렌더링
- [ ] 비디오 다운로드

### 채팅 기능
- [ ] 채팅 메시지 전송
- [ ] 스트리밍 응답 확인

---

## 📊 9단계: 모니터링 및 최적화

### 로그 확인
- [ ] Cloudflare Workers 로그 확인
- [ ] 렌더링 서버 로그 확인
- [ ] 에러 로그 모니터링

### 성능 확인
- [ ] 페이지 로드 속도 확인
- [ ] API 응답 시간 확인
- [ ] 렌더링 시간 확인

### 보안 확인
- [ ] HTTPS 연결 확인
- [ ] CORS 설정 확인
- [ ] 환경 변수 노출 확인 (없어야 함)

---

## 🎉 배포 완료

### 최종 확인
- [ ] 모든 기능 정상 작동
- [ ] 외부 사용자 접근 가능
- [ ] 도메인 연결 완료
- [ ] SSL 인증서 활성화

### 문서화
- [ ] 배포 가이드 문서 확인
- [ ] 환경 변수 목록 정리
- [ ] 문제 해결 가이드 작성 (필요 시)

---

## 🆘 문제 해결

### 일반적인 문제
- [ ] CORS 오류 → CORS 설정 확인
- [ ] 환경 변수 오류 → Secret 설정 확인
- [ ] 빌드 실패 → 로그 확인 및 의존성 확인
- [ ] 도메인 연결 실패 → DNS 설정 확인

### 지원 링크
- Cloudflare 문서: https://developers.cloudflare.com/
- Railway 문서: https://docs.railway.app/
- Render 문서: https://render.com/docs

