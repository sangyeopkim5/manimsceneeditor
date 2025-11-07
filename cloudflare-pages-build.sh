#!/bin/bash
# Cloudflare Pages 빌드 스크립트
# 이 스크립트는 Cloudflare Pages의 자동 빌드 과정에서 실행됩니다.

set -e  # 에러 발생 시 즉시 종료

# 색상 출력을 위한 변수 (Cloudflare Pages 환경에서는 단순 텍스트로 표시될 수 있음)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_success() {
    echo "[SUCCESS] $1"
}

log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Cloudflare Pages 빌드 시작"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 현재 디렉토리 확인
log_info "현재 작업 디렉토리: $(pwd)"

# UI 디렉토리 존재 확인
if [ ! -d "ui" ]; then
    log_error "ui 디렉토리를 찾을 수 없습니다."
    log_error "현재 디렉토리: $(pwd)"
    log_error "디렉토리 내용: $(ls -la)"
    exit 1
fi

# UI 디렉토리로 이동
log_info "ui 디렉토리로 이동 중..."
cd ui || {
    log_error "ui 디렉토리로 이동할 수 없습니다."
    exit 1
}

log_info "작업 디렉토리: $(pwd)"

# pnpm 설치 확인
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm이 설치되어 있지 않습니다."
    log_info "pnpm 설치 중..."
    npm install -g pnpm || {
        log_error "pnpm 설치에 실패했습니다."
        exit 1
    }
fi

log_info "pnpm 버전: $(pnpm --version)"

# 의존성 설치
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "의존성 설치 중..."
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! pnpm install --frozen-lockfile; then
    log_error "의존성 설치에 실패했습니다."
    log_info "frozen-lockfile 없이 재시도 중..."
    if ! pnpm install; then
        log_error "의존성 설치에 실패했습니다."
        exit 1
    fi
fi

log_success "의존성 설치 완료"

# 프로덕션 빌드
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "프로덕션 빌드 시작..."
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! pnpm run build; then
    log_error "빌드에 실패했습니다."
    exit 1
fi

# 빌드 출력 디렉토리 확인
if [ ! -d "dist" ]; then
    log_error "빌드 출력 디렉토리(dist)를 찾을 수 없습니다."
    exit 1
fi

log_success "빌드 완료"
log_info "빌드 출력 디렉토리: $(pwd)/dist"
log_info "빌드 출력 파일 수: $(find dist -type f | wc -l)"

log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Cloudflare Pages 빌드 성공"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

