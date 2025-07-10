# ZAVIS 로그인 인증 시스템

## 개요
ZAVIS 웹앱에 Supabase 기반 로그인 인증 기능을 구현한 프로젝트입니다.

## 주요 기능
- 회원가입 및 이메일 인증
- 로그인/로그아웃
- 사용자 프로필 관리
- 방문 횟수 추적
- PWA 지원

## 기술 스택
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth

## 파일 구조
- `index.html`: 메인 페이지
- `login.html`: 로그인 페이지
- `signup.html`: 회원가입 페이지
- `auth-confirm.html`: 이메일 인증 확인 페이지
- `auth.js`: 인증 관련 함수들
- `config.js`: Supabase 설정
- `sw.js`: PWA 서비스 워커
- `manifest.json`: PWA 설정

## 배포
GitHub Pages를 통해 배포됩니다.

## 업데이트 로그
- 2024-01-09: 이메일 인증 시스템 개선 및 GitHub Pages 배포 설정