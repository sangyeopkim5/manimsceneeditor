# 🚀 Manim Scene Editor - 서버 실행 가이드

## 📋 목차
1. [프론트엔드 끄기](#프론트엔드-끄기)
2. [프론트엔드 다시 키기](#프론트엔드-다시-키기)
3. [백엔드와 한번에 키기](#백엔드와-한번에-키기)

---

## 🛑 프론트엔드 끄기

### 방법 1: 터미널에서 직접 종료 (가장 간단)
프론트엔드가 실행 중인 터미널에서:
```
Ctrl + C
```

### 방법 2: 포트로 프로세스 찾아서 종료
PowerShell에서 실행:
```powershell
# 포트 3000을 사용하는 프로세스 찾기
$processId = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    Stop-Process -Id $processId -Force
    Write-Host "✅ 프론트엔드 서버가 종료되었습니다." -ForegroundColor Green
} else {
    Write-Host "❌ 포트 3000을 사용하는 프로세스를 찾을 수 없습니다." -ForegroundColor Red
}
```

### 방법 3: 모든 Node 프로세스 종료 (주의!)
```powershell
Get-Process node | Stop-Process -Force
```

---

## ▶️ 프론트엔드 다시 키기

### 방법 1: UI 폴더에서 직접 실행
```bash
cd C:\Users\PC\Desktop\ManimSceneEditor\my-app\ui
pnpm dev
```

### 방법 2: 프로젝트 루트에서 실행
```bash
cd C:\Users\PC\Desktop\ManimSceneEditor\my-app
pnpm run dev:ui
```

브라우저에서 `http://localhost:3000` 접속

---

## 🚀 백엔드와 한번에 키기

### 방법 1: PowerShell 스크립트 사용 (추천)
```powershell
cd C:\Users\PC\Desktop\ManimSceneEditor\my-app\ui
.\start-all.ps1
```

이 스크립트는 프론트엔드와 백엔드를 각각 별도의 PowerShell 창에서 실행합니다.

### 방법 2: package.json 스크립트 사용
```bash
cd C:\Users\PC\Desktop\ManimSceneEditor\my-app
pnpm run dev:all
```

이 명령어는 `concurrently`를 사용하여 한 터미널에서 두 서버를 동시에 실행합니다.

### 방법 3: 수동으로 두 터미널에서 실행

**터미널 1 (프론트엔드):**
```bash
cd C:\Users\PC\Desktop\ManimSceneEditor\my-app\ui
pnpm dev
```

**터미널 2 (백엔드):**
```bash
cd C:\Users\PC\Desktop\manion-vastai
py -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📝 사용 가능한 스크립트

프로젝트 루트(`my-app`)에서 실행:

- `pnpm run dev:ui` - 프론트엔드만 실행
- `pnpm run dev:render` - 백엔드(Python)만 실행
- `pnpm run dev:all` - 프론트엔드 + 백엔드 동시 실행

---

## ⚠️ 주의사항

1. **포트 충돌**: 포트 3000(프론트엔드) 또는 8000(백엔드)이 이미 사용 중이면 오류가 발생합니다.
2. **Python 서버**: 백엔드는 Python 환경이 필요하며, `manion-vastai` 폴더에 `.env` 파일이 설정되어 있어야 합니다.
3. **의존성**: 처음 실행 시 `pnpm install`로 의존성을 설치해야 합니다.

---

## 🔍 현재 실행 중인 서버 확인

```powershell
# 포트 3000 확인
netstat -ano | findstr :3000

# 포트 8000 확인
netstat -ano | findstr :8000
```
