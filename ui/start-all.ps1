# 프론트엔드 + 백엔드 한번에 실행 스크립트

# 현재 스크립트의 디렉토리에서 my-app 디렉토리 찾기
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$myAppDir = Split-Path -Parent $scriptDir
$serverDir = Join-Path $myAppDir "server"

# 프론트엔드 (UI)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir'; Write-Host '🚀 Starting Frontend...' -ForegroundColor Green; pnpm dev"

# 백엔드 (Node.js 서버)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverDir'; Write-Host '🔧 Starting Backend Server...' -ForegroundColor Cyan; pnpm dev"

Write-Host "✅ Both servers are starting in separate windows!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8787" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: Close the PowerShell windows or press Ctrl+C in each window" -ForegroundColor Gray



