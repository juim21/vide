# Vide - 숏폼 비디오 플랫폼

TikTok/YouTube Shorts 스타일의 숏폼 비디오 플랫폼 MVP입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모노레포 | npm workspaces + Turborepo |
| 프론트엔드 | Next.js 16 (App Router) + Tailwind CSS |
| 상태관리 | Zustand |
| 백엔드 | Fastify 5 |
| DB | SQLite (better-sqlite3) + Drizzle ORM |
| 영상처리 | ffmpeg (fluent-ffmpeg) |
| 인증 | JWT (access token + httpOnly refresh cookie) |

## 프로젝트 구조

```
vide/
├── apps/
│   ├── web/          # Next.js 프론트엔드 (port 3000)
│   │   └── src/
│   │       ├── app/          # 페이지 (feed, explore, upload, profile, auth)
│   │       ├── components/   # UI 컴포넌트 (SwipeFeed, VideoPlayer, CommentSheet 등)
│   │       ├── stores/       # Zustand 스토어 (auth, feed)
│   │       └── lib/          # API 클라이언트
│   └── server/       # Fastify 백엔드 (port 3001)
│       └── src/
│           ├── routes/       # API 라우트 (auth, videos, feed, users)
│           ├── db/           # Drizzle 스키마 + 마이그레이션
│           ├── middleware/    # 인증 미들웨어
│           └── utils/        # JWT, 해싱 유틸
└── packages/
    └── shared/       # 공유 타입/상수
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm 9+
- ffmpeg (선택 - 썸네일 생성에 필요)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트엔드 + 백엔드 동시)
npx turbo dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:3001

## 주요 기능

### 인증
- 회원가입 / 로그인 / 로그아웃
- JWT 기반 인증 (자동 토큰 갱신)

### 영상
- 드래그앤드롭 영상 업로드 (MP4, WebM, MOV / 최대 100MB)
- ffmpeg 썸네일 자동 생성
- HTTP Range 요청 기반 스트리밍

### 피드
- 수직 스와이프 피드 (Swiper.js)
- 추천 / 팔로잉 / 트렌딩 탭
- 자동 재생 + 일시정지
- 커서 기반 무한 스크롤

### 소셜
- 좋아요 / 언좋아요 (Optimistic UI)
- 댓글 작성 / 삭제 (바텀시트)
- 팔로우 / 언팔로우

### 프로필
- 유저 프로필 (팔로워, 팔로잉, 영상 수)
- 업로드한 영상 / 좋아요한 영상 탭

### 탐색
- 트렌딩 영상 그리드

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 |
| POST | `/api/videos` | 영상 업로드 |
| GET | `/api/videos/:id` | 영상 조회 |
| DELETE | `/api/videos/:id` | 영상 삭제 |
| GET | `/api/feed` | 추천 피드 |
| GET | `/api/feed/following` | 팔로잉 피드 |
| GET | `/api/feed/trending` | 트렌딩 피드 |
| POST | `/api/videos/:id/like` | 좋아요 |
| DELETE | `/api/videos/:id/like` | 좋아요 취소 |
| GET | `/api/videos/:id/comments` | 댓글 목록 |
| POST | `/api/videos/:id/comments` | 댓글 작성 |
| DELETE | `/api/comments/:id` | 댓글 삭제 |
| GET | `/api/users/:username` | 유저 프로필 |
| POST | `/api/users/:username/follow` | 팔로우 |
| DELETE | `/api/users/:username/follow` | 언팔로우 |

## DB 스키마

6개 테이블: `users`, `videos`, `likes`, `comments`, `follows`, `video_views`

## 라이선스

MIT
