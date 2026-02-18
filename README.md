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
│   ├── web/                  # Next.js 프론트엔드 (port 3000)
│   │   └── src/
│   │       ├── app/          # 페이지 (feed, explore, upload, profile, auth)
│   │       ├── components/   # UI 컴포넌트
│   │       │   ├── SwipeFeed.tsx       # 수직 스와이프 피드 (Swiper.js)
│   │       │   ├── VideoPlayer.tsx     # 영상 재생 + 프로그레스 바
│   │       │   ├── CommentSheet.tsx    # 댓글 바텀시트
│   │       │   ├── EditProfileModal.tsx # 프로필 편집 모달
│   │       │   ├── ErrorBoundary.tsx   # 에러 바운더리
│   │       │   ├── Toast.tsx           # 토스트 알림 시스템
│   │       │   ├── Skeleton.tsx        # 로딩 스켈레톤
│   │       │   ├── BottomNav.tsx       # 하단 네비게이션
│   │       │   └── ClientLayout.tsx    # 클라이언트 레이아웃
│   │       ├── stores/       # Zustand 스토어 (auth, feed)
│   │       └── lib/          # API 클라이언트 (자동 토큰 갱신)
│   └── server/               # Fastify 백엔드 (port 3001)
│       └── src/
│           ├── routes/       # API 라우트 (auth, videos, feed, users)
│           ├── db/           # Drizzle 스키마 + 마이그레이션 + 시드
│           ├── middleware/    # 인증 미들웨어
│           └── utils/        # JWT, 해싱 유틸
└── packages/
    └── shared/               # 공유 타입/상수
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

### 시드 데이터 (선택)

테스트용 계정 5개를 생성합니다.

```bash
npm run db:seed -w @vide/server
```

생성되는 계정 (비밀번호: `password123`):
- `alice@vide.com` / `bob@vide.com` / `charlie@vide.com` / `diana@vide.com` / `evan@vide.com`

### 환경변수

`apps/server/src/.env.example`을 참고하여 환경변수를 설정할 수 있습니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3001` | 서버 포트 |
| `JWT_ACCESS_SECRET` | `vide-access-secret-dev` | JWT access token 시크릿 |
| `JWT_REFRESH_SECRET` | `vide-refresh-secret-dev` | JWT refresh token 시크릿 |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용할 프론트엔드 origin |

## 주요 기능

### 인증
- 회원가입 / 로그인 / 로그아웃
- JWT 기반 인증 (자동 토큰 갱신)
- httpOnly cookie로 refresh token 관리 (XSS 안전)

### 영상
- 드래그앤드롭 영상 업로드 (MP4, WebM, MOV / 최대 100MB, 60초)
- 업로드 프로그레스 바
- ffmpeg 썸네일 자동 생성 + 메타데이터 추출
- HTTP Range 요청 기반 스트리밍
- 영상 삭제 (프로필에서)

### 피드
- 수직 스와이프 피드 (Swiper.js + Virtual Slides)
- 추천 / 팔로잉 / 트렌딩 탭
- 추천 알고리즘: 시간 가중(70%) + 인게이지먼트 점수(30%), 이미 본 영상 제외
- 자동 재생 + 탭하여 일시정지
- 영상 프로그레스 바 (클릭으로 탐색 가능)
- 커서 기반 무한 스크롤 + 프리페칭

### 소셜
- 좋아요 / 언좋아요 (Optimistic UI + 애니메이션)
- 댓글 작성 / 삭제 (바텀시트 UI)
- 팔로우 / 언팔로우 (Optimistic UI)
- 공유 (Web Share API / 클립보드 복사)

### 프로필
- 유저 프로필 (팔로워, 팔로잉, 영상 수)
- 업로드한 영상 / 좋아요한 영상 탭
- 프로필 편집 (이름, 소개)
- 본인 영상 삭제

### 탐색
- 트렌딩 영상 그리드

### UX
- 로딩 스켈레톤 (프로필, 영상 그리드)
- 글로벌 에러 바운더리 (다시 시도 버튼)
- 토스트 알림 (성공 / 에러 / 정보)
- 비로그인 시 안내 토스트

### 보안
- Rate limiting (분당 100요청)
- JWT access/refresh 토큰 분리
- httpOnly cookie (XSS 방어)
- 파일 타입/크기/시간 검증

## API 엔드포인트

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/auth/signup` | - | 회원가입 |
| POST | `/api/auth/login` | - | 로그인 |
| POST | `/api/auth/refresh` | Cookie | 토큰 갱신 |
| POST | `/api/auth/logout` | - | 로그아웃 |
| GET | `/api/auth/me` | Bearer | 내 정보 |
| PATCH | `/api/users/me` | Bearer | 프로필 편집 |
| GET | `/api/users/:username` | Optional | 유저 프로필 |
| GET | `/api/users/:username/videos` | Optional | 유저 영상 목록 |
| GET | `/api/users/:username/likes` | Optional | 유저 좋아요 목록 |
| POST | `/api/users/:username/follow` | Bearer | 팔로우 |
| DELETE | `/api/users/:username/follow` | Bearer | 언팔로우 |
| POST | `/api/videos` | Bearer | 영상 업로드 (multipart) |
| GET | `/api/videos/:id` | Optional | 영상 조회 |
| DELETE | `/api/videos/:id` | Bearer | 영상 삭제 |
| POST | `/api/videos/:id/like` | Bearer | 좋아요 |
| DELETE | `/api/videos/:id/like` | Bearer | 좋아요 취소 |
| POST | `/api/videos/:id/view` | Bearer | 조회수 기록 |
| GET | `/api/videos/:id/comments` | - | 댓글 목록 |
| POST | `/api/videos/:id/comments` | Bearer | 댓글 작성 |
| DELETE | `/api/comments/:id` | Bearer | 댓글 삭제 |
| GET | `/api/feed` | Optional | 추천 피드 |
| GET | `/api/feed/following` | Bearer | 팔로잉 피드 |
| GET | `/api/feed/trending` | Optional | 트렌딩 피드 |

## DB 스키마

6개 테이블:

- **users** - 사용자 정보 (username, email, password_hash, display_name, avatar_url, bio)
- **videos** - 영상 메타데이터 (title, file_path, thumbnail_path, duration, 카운터들, status)
- **likes** - 좋아요 (user_id + video_id 복합 PK)
- **comments** - 댓글 (content, user_id FK, video_id FK)
- **follows** - 팔로우 관계 (follower_id + following_id 복합 PK)
- **video_views** - 시청 기록 (user_id + video_id 복합 PK, watched_seconds)

## 라이선스

MIT
