# Vide - 숏폼 비디오 플랫폼

Turborepo 기반 모노레포 프로젝트. Fastify 백엔드 + Next.js 프론트엔드.

## 기술 스택

- **서버**: Fastify, Drizzle ORM, better-sqlite3, JWT 인증, ffmpeg
- **웹**: Next.js 16, React 19, Tailwind CSS 4, Zustand, Swiper
- **공통**: TypeScript, Turborepo, npm workspaces

## 프로젝트 구조

```
apps/
  server/     # Fastify API 서버 (포트 3001)
  web/        # Next.js 프론트엔드 (포트 3000)
packages/
  shared/     # 공유 타입 정의
```

## 실행 방법

### 1. 의존성 설치

```bash
# 루트에서 실행 (모노레포 전체 설치)
npm install
```

### 2. 데이터베이스 초기화 (최초 1회)

```bash
cd apps/server
npx tsx src/db/migrate.ts
npx tsx src/db/seed.ts     # (선택) 시드 데이터 삽입
```

### 3. 개발 서버 실행

```bash
# 루트에서 실행 - 서버 + 웹 동시 실행
npm run dev
```

또는 각각 실행:

```bash
# 서버 (포트 3001)
cd apps/server
npm run dev

# 웹 (포트 3000) - 별도 터미널
cd apps/web
npm run dev
```

### 4. 빌드

```bash
# 전체 빌드
npm run build

# 서버만 빌드
cd apps/server && npm run build

# 웹만 빌드
cd apps/web && npm run build
```

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 메인 피드 (숏폼 스와이프) |
| `/explore` | 탐색 / 검색 |
| `/upload` | 영상 업로드 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/profile/[id]` | 유저 프로필 (ID 기반) |
| `/video/[id]` | 개별 영상 페이지 |

## 환경 변수

웹 앱에서 API 서버 주소를 변경하려면:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

기본값은 `http://localhost:3001`입니다.

## 업데이트 이력

| 날짜 | 내용 |
|------|------|
| 2025-02-23 | 프로필 ID 기반 전환 (`/profile/[username]` → `/profile/[id]`), 더블탭 좋아요 + 하트 애니메이션 추가 |
| 2025-02-23 | 팔로우 API 및 프로필 URL 인코딩 수정 |
| 2025-02-22 | 개별 영상 페이지 (`/video/[id]`) 추가, 피드 안정성 개선 |
| 2025-02-22 | 피드 안정성 및 빈 상태 UI 개선 |
| 2025-02-22 | username 중복 허용, 빈 피드 UI 개선 |
