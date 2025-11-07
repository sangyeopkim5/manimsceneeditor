#!/bin/bash
# Cloudflare Pages 빌드 스크립트

# UI 디렉토리로 이동
cd ui

# 의존성 설치
pnpm install

# 프로덕션 빌드
pnpm run build

# 빌드 출력 디렉토리는 ui/dist

