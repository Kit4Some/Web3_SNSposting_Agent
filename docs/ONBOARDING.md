# Web3 Security News Agent - 신입 개발자 온보딩 가이드

> 이 문서는 프로젝트에 새로 합류하는 개발자가 코드베이스를 빠르게 이해하고 즉시 개발에 투입될 수 있도록 작성되었습니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [개발 환경 설정](#2-개발-환경-설정)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [아키텍처 개요](#4-아키텍처-개요)
5. [IPC 통신 시스템](#5-ipc-통신-시스템)
6. [데이터베이스 계층](#6-데이터베이스-계층)
7. [백엔드 서비스 상세](#7-백엔드-서비스-상세)
8. [프론트엔드 구조](#8-프론트엔드-구조)
9. [핵심 데이터 흐름 (End-to-End)](#9-핵심-데이터-흐름-end-to-end)
10. [멀티 계정(세션) 시스템](#10-멀티-계정세션-시스템)
11. [보안 고려사항](#11-보안-고려사항)
12. [자주 하는 개발 작업 가이드](#12-자주-하는-개발-작업-가이드)
13. [디버깅 & 트러블슈팅](#13-디버깅--트러블슈팅)
14. [코딩 컨벤션 & 규칙](#14-코딩-컨벤션--규칙)

---

## 1. 프로젝트 소개

### 앱의 목적

**Web3 Security News Agent**는 Web3/DeFi 생태계에서 발생하는 보안 사고(해킹, 익스플로잇 등)를 **자동으로 수집**하고, **AI(GPT-4)로 전문 뉴스 요약문과 이미지를 생성**한 뒤, **X(Twitter)에 자동 게시**하는 데스크톱 애플리케이션입니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 뉴스 수집 | DeFiLlama API, Rekt News 스크래핑, RSS 피드에서 보안 사고 데이터 자동 수집 |
| AI 요약 | OpenAI GPT-4로 Bloomberg/Reuters 스타일의 전문 트윗 텍스트 생성 (260자 이내) |
| AI 이미지 | DALL-E 3로 사이버보안 뉴스 일러스트레이션 자동 생성 (1024x1024) |
| Twitter 게시 | OAuth 1.0a / OAuth 2.0 PKCE를 통한 자동 트윗 게시 |
| 스케줄링 | node-schedule 기반 뉴스 수집 및 포스팅 자동화 |
| 멀티 계정 | 여러 Twitter 계정에 독립적으로 포스팅 가능 (세션 시스템) |
| 다국어 지원 | 한국어, 영어, 일본어, 중국어 UI 지원 |

### 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| **프레임워크** | Electron | v40.x |
| **프론트엔드** | React + TypeScript | React 18 / TS 5.3 |
| **빌드 도구** | Vite | v7.x |
| **스타일링** | Tailwind CSS | v3.4 |
| **상태 관리** | React useState/useEffect (로컬) | - |
| **라우팅** | React Router DOM | v6.22 |
| **데이터베이스** | sql.js (SQLite WASM) | v1.10 |
| **AI** | OpenAI SDK (GPT-4 + DALL-E 3) | v4.28 |
| **Twitter** | twitter-api-v2 | v1.15 |
| **스케줄러** | node-schedule | v2.1 |
| **스크래핑** | cheerio + axios | - |
| **RSS 파싱** | rss-parser | v3.13 |
| **다국어** | i18next + react-i18next | v25.x / v16.x |
| **아이콘** | Lucide React | v0.344 |
| **패키징** | electron-builder | v26.x |

---

## 2. 개발 환경 설정

### 2.1 필수 도구

- **Node.js**: v18 이상 (LTS 권장)
- **npm**: v9 이상 (Node.js와 함께 설치됨)
- **Git**: 버전 관리
- **VS Code**: 권장 에디터 (ESLint, Tailwind IntelliSense, TypeScript 확장 설치 권장)

### 2.2 프로젝트 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd Newslatter_app

# 2. 의존성 설치
npm install

# 3. 환경변수 설정 (.env.example을 참고하여 .env 파일 생성)
cp .env.example .env
```

### 2.3 환경변수 (.env)

```env
# OpenAI API Key (GPT-4 요약 및 DALL-E 3 이미지 생성용)
OPENAI_API_KEY=sk-your-openai-api-key

# Twitter API 인증 (OAuth 1.0a)
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret

# (선택) Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

> **참고**: 실제 운영 시에는 앱의 Settings 페이지에서 API 키를 입력하면 SQLite DB에 암호화 저장됩니다. 환경변수는 초기 개발 시에만 사용됩니다.

### 2.4 실행 명령어

```bash
# 개발 모드 실행 (Vite 핫 리로드 + Electron)
npm run dev

# 프로덕션 빌드 (Windows)
npm run build:win

# 전체 플랫폼 빌드
npm run build

# 린트 검사
npm run lint
```

### 2.5 개발 모드에서의 동작

`npm run dev` 실행 시:
1. Vite 개발 서버가 `http://localhost:5173`에서 시작
2. Electron 메인 프로세스가 `electron/main.ts`에서 시작
3. BrowserWindow가 Vite 개발 서버를 로드
4. **DevTools가 자동으로 열림** (디버깅 용이)
5. 프론트엔드 코드 변경 시 **핫 리로드** 자동 적용

---

## 3. 프로젝트 구조

```
Newslatter_app/
│
├── electron/                          # [Main Process] Node.js 백엔드
│   ├── main.ts                       # Electron 앱 진입점, 윈도우 생성 & 라이프사이클
│   ├── preload.ts                    # IPC 브릿지 (window.api로 렌더러에 노출)
│   │
│   ├── database/                     # 데이터베이스 계층
│   │   ├── index.ts                  # sql.js 초기화, 마이그레이션, 쿼리 헬퍼
│   │   └── repositories/            # Repository 패턴 데이터 접근 계층
│   │       ├── index.ts             # 모든 Repository 통합 export
│   │       ├── news-repository.ts   # 뉴스 아이템 CRUD
│   │       ├── post-repository.ts   # 포스트 CRUD + 상태 관리
│   │       ├── source-repository.ts # 뉴스 소스 CRUD
│   │       ├── session-repository.ts # 세션(멀티 계정) CRUD
│   │       ├── template-repository.ts # AI 템플릿 CRUD
│   │       └── settings-repository.ts # 설정 Key-Value 저장소
│   │
│   ├── services/                     # 비즈니스 로직 서비스
│   │   ├── news/                    # 뉴스 수집 서비스
│   │   │   ├── index.ts            # NewsService 오케스트레이터
│   │   │   ├── base-source.ts      # 뉴스 소스 추상 기본 클래스
│   │   │   ├── defillama-source.ts # DeFiLlama API 수집기
│   │   │   ├── rekt-news-source.ts # Rekt News 웹 스크래퍼
│   │   │   └── rss-source.ts       # RSS 피드 파서
│   │   │
│   │   ├── ai/                      # AI 서비스
│   │   │   ├── index.ts            # AIService 오케스트레이터
│   │   │   ├── text-generator.ts   # GPT-4 텍스트 요약 생성
│   │   │   └── image-generator.ts  # DALL-E 3 이미지 생성
│   │   │
│   │   ├── twitter/                 # Twitter 게시 서비스
│   │   │   └── index.ts            # OAuth 인증 + 트윗 게시
│   │   │
│   │   └── scheduler/              # 자동화 스케줄러
│   │       └── index.ts            # node-schedule 기반 작업 스케줄링
│   │
│   ├── ipc/                          # IPC 핸들러 (프론트엔드 ↔ 백엔드 연결)
│   │   ├── index.ts                 # 모든 핸들러 통합 등록
│   │   ├── news-handlers.ts        # 뉴스 관련 IPC 핸들러
│   │   ├── source-handlers.ts      # 소스 관련 IPC 핸들러
│   │   ├── post-handlers.ts        # 포스트 관련 IPC 핸들러
│   │   ├── ai-handlers.ts          # AI 관련 IPC 핸들러
│   │   ├── twitter-handlers.ts     # Twitter 관련 IPC 핸들러
│   │   ├── scheduler-handlers.ts   # 스케줄러 관련 IPC 핸들러
│   │   ├── session-handlers.ts     # 세션 관련 IPC 핸들러
│   │   ├── settings-handlers.ts    # 설정 관련 IPC 핸들러
│   │   ├── template-handlers.ts    # 템플릿 관련 IPC 핸들러
│   │   └── app-handlers.ts         # 앱 전역 IPC 핸들러
│   │
│   └── utils/
│       └── logger.ts                # 파일 기반 로거 (일별 로그 파일)
│
├── src/                               # [Renderer Process] React 프론트엔드
│   ├── main.tsx                      # 렌더러 진입점 (React 루트 마운트)
│   ├── App.tsx                       # 라우팅 정의 (5개 페이지)
│   │
│   ├── api/
│   │   └── index.ts                 # window.api 래퍼 (타입 안전 API 호출)
│   │
│   ├── pages/                        # 페이지 컴포넌트
│   │   ├── Dashboard.tsx            # 대시보드 (통계, 최근 뉴스/포스트, 빠른 작업)
│   │   ├── NewsPage.tsx             # 뉴스 목록 & 관리
│   │   ├── PostsPage.tsx            # 포스트 대기열 & 히스토리
│   │   ├── SessionsPage.tsx         # 멀티 계정 세션 관리
│   │   └── SettingsPage.tsx         # 앱 설정 (API 키, 스케줄, 소스, 템플릿)
│   │
│   ├── components/
│   │   └── layout/                  # 레이아웃 컴포넌트
│   │       ├── MainLayout.tsx       # 전체 레이아웃 (사이드바 + 헤더 + 콘텐츠)
│   │       ├── TitleBar.tsx         # 커스텀 타이틀바 (최소화/최대화/닫기)
│   │       ├── Sidebar.tsx          # 좌측 네비게이션 사이드바
│   │       └── Header.tsx           # 상단 헤더 (스케줄러 상태 & 빠른 동작)
│   │
│   ├── styles/
│   │   └── globals.css              # 전역 스타일 (Tailwind + 커스텀 유틸리티)
│   │
│   ├── i18n/
│   │   └── index.ts                 # i18next 다국어 설정
│   │
│   └── types/                        # 프론트엔드 타입 정의
│
├── shared/                            # Main & Renderer 공유 모듈
│   ├── ipc-channels.ts               # IPC 채널명 상수 정의 (50+ 채널)
│   └── types/
│       └── index.ts                  # 공유 TypeScript 인터페이스 (20+ 타입)
│
├── index.html                         # HTML 진입점 (Vite 모듈 로딩)
├── package.json                       # 의존성 & 스크립트
├── vite.config.ts                     # Vite 빌드 설정 (경로 별칭 포함)
├── tsconfig.json                      # TypeScript 설정 (렌더러)
├── tsconfig.node.json                 # TypeScript 설정 (메인 프로세스)
├── tailwind.config.js                 # Tailwind CSS 테마 설정
├── postcss.config.js                  # PostCSS 플러그인 설정
├── electron-builder.json              # Electron 패키징 설정
├── .eslintrc.cjs                      # ESLint 린트 규칙
├── .env.example                       # 환경변수 템플릿
└── CLAUDE.md                          # 프로젝트 가이드 (AI 어시스턴트용)
```

---

## 4. 아키텍처 개요

### 4.1 Electron 프로세스 모델

Electron 앱은 **3개의 격리된 프로세스**로 구성됩니다:

```
┌──────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
│                                                                  │
│  ┌─────────────────────┐    IPC     ┌─────────────────────────┐ │
│  │   Renderer Process  │◄──Bridge──►│    Main Process          │ │
│  │   (React UI)        │            │    (Node.js Backend)     │ │
│  │                     │            │                          │ │
│  │  - React 18         │  preload   │  - Database (sql.js)    │ │
│  │  - React Router     │◄──.ts────►│  - News Collectors      │ │
│  │  - Tailwind CSS     │            │  - AI Service (OpenAI)  │ │
│  │  - i18next          │            │  - Twitter API          │ │
│  │  - Lucide Icons     │            │  - Scheduler            │ │
│  │                     │            │  - File System           │ │
│  └─────────────────────┘            └─────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| 프로세스 | 역할 | 접근 가능 리소스 |
|----------|------|-----------------|
| **Main Process** | Node.js 백엔드. DB, 파일시스템, 외부 API 접근 | 모든 Node.js API |
| **Renderer Process** | React UI 렌더링. 사용자 인터페이스 담당 | DOM, window.api만 |
| **Preload Script** | 두 프로세스 사이의 안전한 브릿지 | ipcRenderer |

### 4.2 계층 구조 다이어그램

프론트엔드에서 백엔드까지의 데이터 흐름을 6개 계층으로 나눌 수 있습니다:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: UI (React Pages)                                   │
│  src/pages/Dashboard.tsx, NewsPage.tsx, PostsPage.tsx ...    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: API Wrapper                                        │
│  src/api/index.ts → window.api.* 호출                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: IPC Bridge (Preload)                               │
│  electron/preload.ts → ipcRenderer.invoke(채널명, 인자)      │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: IPC Handlers                                       │
│  electron/ipc/*.ts → ipcMain.handle(채널명, 핸들러함수)      │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Business Logic (Services)                          │
│  electron/services/news/, ai/, twitter/, scheduler/          │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: Data Access (Repository + Database)                │
│  electron/database/repositories/*.ts → sql.js SQLite         │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 앱 시작 순서 (electron/main.ts)

```
app.whenReady()
  │
  ├── 1. initDatabase()         → sql.js 초기화 & 마이그레이션 실행
  ├── 2. registerWindowControls() → 윈도우 컨트롤 IPC 등록
  ├── 3. createWindow()          → BrowserWindow 생성 (frameless, 1280x800)
  ├── 4. registerAllHandlers()   → 모든 IPC 핸들러 등록 (10개 모듈)
  ├── 5. createTray()            → 시스템 트레이 아이콘 생성
  └── 6. schedulerService.start() → 뉴스 수집 & 포스팅 스케줄 시작
```

**종료 시**: `before-quit` → 스케줄러 정지 → DB 저장 & 닫기

**창 닫기 시**: 앱이 종료되지 않고 **시스템 트레이로 최소화** (백그라운드 실행 유지)

---

## 5. IPC 통신 시스템

Electron에서는 보안상의 이유로 Renderer(React)에서 Node.js API에 직접 접근할 수 없습니다. 대신 **IPC(Inter-Process Communication)**를 통해 통신합니다.

### 5.1 채널 정의 (shared/ipc-channels.ts)

모든 IPC 채널은 `shared/ipc-channels.ts`에 중앙 관리됩니다:

```typescript
export const IPC_CHANNELS = {
  NEWS: {
    FETCH_ALL: 'news:fetch-all',
    GET_LIST: 'news:get-list',
    GET_ITEM: 'news:get-item',
    // ...
  },
  SOURCES: { /* ... */ },
  POSTS: { /* ... */ },
  AI: { /* ... */ },
  TEMPLATES: { /* ... */ },
  SETTINGS: { /* ... */ },
  SCHEDULER: { /* ... */ },
  TWITTER: { /* ... */ },
  APP: { /* ... */ },
  SESSIONS: { /* ... */ },
} as const;
```

**10개 도메인**, **50개 이상의 채널**이 정의되어 있습니다. 채널명은 `도메인:동작` 패턴입니다 (예: `news:fetch-all`, `posts:publish-now`).

### 5.2 통신 흐름 (예: 뉴스 목록 조회)

```
[1] React UI (NewsPage.tsx)
    const result = await api.news.getList({ limit: 50 });

[2] API Wrapper (src/api/index.ts)
    → window.api.news.getList(params)

[3] Preload Bridge (electron/preload.ts)
    → ipcRenderer.invoke('news:get-list', params)

[4] IPC Handler (electron/ipc/news-handlers.ts)
    ipcMain.handle('news:get-list', async (_, params) => {
      const items = newsService.getNewsList(params);
      return { success: true, data: items };
    });

[5] Service (electron/services/news/index.ts)
    → newsRepository.getAll(limit, offset)

[6] Repository (electron/database/repositories/news-repository.ts)
    → SQL 쿼리 실행 → 결과 반환
```

### 5.3 IPC 핸들러 패턴

모든 IPC 핸들러는 동일한 패턴을 따릅니다:

```typescript
// electron/ipc/news-handlers.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export function registerNewsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NEWS.GET_LIST, async (_, params) => {
    try {
      const items = newsService.getNewsList(params);
      return { success: true, data: items };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
```

**핵심 규칙**:
- 모든 핸들러는 `{ success: boolean, data?: any, error?: string }` 형태로 반환
- try-catch로 에러를 감싸서 안전하게 에러 메시지 전달
- `registerAllHandlers()`에서 모든 핸들러를 일괄 등록 (electron/ipc/index.ts)

### 5.4 Preload Bridge (electron/preload.ts)

`contextBridge.exposeInMainWorld('api', api)` 를 통해 `window.api` 객체를 렌더러에 노출합니다:

```typescript
const api = {
  news: {
    fetchAll: () => ipcRenderer.invoke(IPC_CHANNELS.NEWS.FETCH_ALL),
    getList: (params?) => ipcRenderer.invoke(IPC_CHANNELS.NEWS.GET_LIST, params),
    // ...
  },
  // ... 10개 도메인
};

contextBridge.exposeInMainWorld('api', api);
```

---

## 6. 데이터베이스 계층

### 6.1 기술 선택: sql.js

이 프로젝트는 **sql.js** (SQLite를 WebAssembly로 컴파일한 버전)를 사용합니다:

- **네이티브 모듈 불필요**: C++ 빌드 도구 없이 순수 JS로 동작
- **Electron 호환성**: 프로세스 간 파일 잠금 문제 없음
- **인메모리 + 파일 저장**: 메모리에서 동작하고, 변경 시 파일로 `export()` 저장
- **DB 위치**: `userData/web3news.db` (Windows: `%APPDATA%/web3-security-news-agent/`)

### 6.2 스키마 (ERD)

```
┌─────────────┐     1:N     ┌──────────────┐     1:N     ┌──────────┐
│  sessions   │◄────────────│   sources    │◄────────────│news_items│
│             │             │              │             │          │
│ id (PK)     │             │ id (PK)      │             │ id (PK)  │
│ name        │             │ session_id(FK)│             │source_id │
│ description │             │ name         │             │external_id│
│ twitter_*   │             │ type         │             │ title    │
│ enabled     │             │ url          │             │ content  │
│ posting_*   │             │ enabled      │             │ summary  │
│ created_at  │             │ config (JSON)│             │amount_lost│
│ updated_at  │             │ last_fetched │             │ chain    │
└─────────────┘             │ created_at   │             │ processed│
      │                     │ updated_at   │             │ ...      │
      │                     └──────────────┘             └──────────┘
      │                                                       │
      │ 1:N                                              1:N  │
      │                     ┌──────────────┐                  │
      └────────────────────►│    posts     │◄─────────────────┘
                            │              │
                            │ id (PK)      │
                            │ session_id   │
                            │ news_item_id │
                            │ content      │     ┌──────────────┐
                            │ image_url    │     │  templates   │
                            │ image_prompt │     │              │
                            │ status       │     │ id (PK)      │
                            │ scheduled_for│     │ name         │
                            │ posted_at    │     │ type         │
                            │ tweet_id     │     │ content      │
                            │ error_message│     │ is_default   │
                            │ created_at   │     │ created_at   │
                            │ updated_at   │     │ updated_at   │
                            └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│  settings    │     │ migrations   │
│              │     │              │
│ key (PK)     │     │ id (PK)      │
│ value        │     │ name (UNIQUE)│
│ updated_at   │     │ applied_at   │
└──────────────┘     └──────────────┘
```

### 6.3 주요 테이블 상세

| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|----------|
| `sessions` | Twitter 멀티 계정 | name, twitter_api_*, posting_interval, posting_time |
| `sources` | 뉴스 수집 소스 설정 | type(`api`/`rss`/`scrape`), url, config(JSON), session_id |
| `news_items` | 수집된 보안 사고 | title, amount_lost, chain, classification, technique, processed |
| `posts` | 생성된 트윗 | content, image_url, status(`draft`/`scheduled`/`posted`/`failed`), tweet_id |
| `templates` | AI 프롬프트 템플릿 | type(`summary`/`image`), content, is_default |
| `settings` | 앱 설정 (Key-Value) | key, value (민감 데이터는 암호화 저장) |
| `migrations` | 스키마 버전 관리 | name, applied_at |

### 6.4 Repository 패턴

모든 데이터 접근은 Repository를 통해 이루어집니다. 서비스 코드에서 직접 SQL을 작성하지 않습니다.

```typescript
// 사용 예시 (서비스에서):
import { newsRepository, postRepository } from '../database/repositories';

// 조회
const items = newsRepository.getAll(limit, offset);
const post = postRepository.getById(postId);

// 삽입
const id = newsRepository.insert(newsItem);

// 수정
postRepository.update(postId, { status: 'posted', tweetId: '...' });

// 삭제
newsRepository.delete(newsId);
```

**각 Repository 역할 요약**:

| Repository | 주요 메서드 |
|------------|------------|
| `newsRepository` | getAll, getUnprocessed, insert, insertMany, updateSummary, markProcessed, existsByExternalId |
| `postRepository` | getQueue, getHistory, getNextScheduled, insert, schedule, markPosted, updateStatus, getNextScheduledBySessionId |
| `sourceRepository` | getAll, getEnabled, getById, toggleEnabled, updateLastFetched, assignToSession |
| `sessionRepository` | getAll, getAllWithStats, getEnabled, create, update, toggle, getTwitterCredentials, hasTwitterCredentials |
| `templateRepository` | getAll, getByType, getDefault, setDefault |
| `settingsRepository` | get, set, getAll, saveAll (민감 키 자동 암호화/복호화) |

### 6.5 쿼리 헬퍼 (electron/database/index.ts)

```typescript
// INSERT/UPDATE/DELETE - 실행 후 자동 저장
execQuery(sql, params?) → { lastInsertRowid, changes }

// SELECT (복수 행)
queryAll<T>(sql, params?) → T[]

// SELECT (단일 행)
queryOne<T>(sql, params?) → T | null

// 트랜잭션 (여러 쿼리를 원자적으로 실행)
runTransaction(() => {
  // 이 안의 모든 쿼리는 하나의 트랜잭션
  // 에러 발생 시 자동 ROLLBACK
})
```

### 6.6 마이그레이션 시스템

마이그레이션은 `electron/database/index.ts`의 `runMigrations()` 함수에서 순차 실행됩니다:

| 마이그레이션 | 내용 |
|-------------|------|
| `001_initial` | 핵심 테이블 5개 + 인덱스 + 기본 소스/템플릿/설정 삽입 |
| `002_sessions` | sessions 테이블 + sources/posts에 session_id FK 추가 |
| `003_professional_templates` | 템플릿을 전문 저널리스트 스타일로 업데이트 |

각 마이그레이션은 `migrations` 테이블로 적용 여부를 확인하며, 이미 적용된 마이그레이션은 건너뜁니다.

---

## 7. 백엔드 서비스 상세

### 7.1 News Service (뉴스 수집)

**파일**: `electron/services/news/`

```
NewsService (오케스트레이터)
  │
  ├── DefiLlamaSource    → DeFiLlama API에서 해킹 데이터 수집
  ├── RektNewsSource     → Rekt.news 웹 스크래핑
  └── RssSource          → RSS 피드 파싱
```

#### BaseNewsSource (추상 클래스)

모든 뉴스 소스의 기본 클래스. `fetch()` 메서드를 오버라이드하여 구현합니다.

```typescript
// electron/services/news/base-source.ts
abstract class BaseNewsSource {
  protected source: NewsSource;
  abstract fetch(): Promise<NewsItem[]>;

  protected createNewsItem(data): Partial<NewsItem> { ... }
  protected formatAmount(amount: number): string { ... } // "50.2M", "1.5B"
}
```

#### DefiLlamaSource

- **API**: `https://api.llama.fi/hacks` (GET, 인증 불필요)
- **필터**: 최근 30일 데이터만 수집
- **중복 방지**: `defillama_${name}_${date}` 형태의 externalId로 중복 체크
- **데이터**: 프로토콜명, 피해금액, 체인, 공격분류, 공격기법

#### RektNewsSource

- **URL**: `https://rekt.news/`
- **방식**: cheerio로 HTML 파싱
- **폴백**: 메인 페이지 → 리더보드 페이지 순으로 시도
- **금액 추출**: 정규식으로 `$X.XB`, `$X.XM`, `$X.XK`, `$1,000,000` 패턴 매칭

#### RssSource

- **범용**: 어떤 RSS 피드 URL이든 지원
- **HTML 정리**: 태그 제거, 엔티티 디코딩, 공백 정규화
- **체인 감지**: Ethereum, BSC, Polygon, Solana 등 알려진 체인명 매칭

#### NewsService (오케스트레이터)

```typescript
// 핵심 메서드:
fetchFromSource(sourceId)     // 단일 소스에서 수집 (중복 필터링 포함)
fetchFromAllSources()         // 활성화된 모든 소스에서 수집 (소스 간 2초 딜레이)
getNewsList({ limit, offset, unprocessedOnly }) // 뉴스 목록 조회
```

### 7.2 AI Service (AI 콘텐츠 생성)

**파일**: `electron/services/ai/`

```
AIService (오케스트레이터)
  │
  ├── TextGenerator     → GPT-4로 트윗 텍스트 생성
  └── ImageGenerator    → DALL-E 3로 이미지 생성
```

#### TextGenerator (GPT-4)

```typescript
// 요약 생성 플로우:
1. 템플릿 로드 (기본 또는 지정 템플릿)
2. 변수 치환: {{name}}, {{amountLost}}, {{chain}}, {{classification}}, {{technique}}, {{content}}, {{url}}
3. OpenAI API 호출:
   - model: 'gpt-4-turbo-preview'
   - max_tokens: 300
   - temperature: 0.7
   - system: "You are a Web3 security news analyst..."
4. 결과를 news_items.summary에 저장
```

#### ImageGenerator (DALL-E 3)

```typescript
// 이미지 생성 플로우:
1. 템플릿 로드 → 변수 치환
2. DALL-E 3 API 호출:
   - size: '1024x1024'
   - quality: 'standard'
   - style: 'vivid'
3. 이미지 다운로드 → userData/generated-images/image_${timestamp}.png 저장
4. 로컬 파일 경로 반환
```

#### AIService (오케스트레이터)

```typescript
// 핵심 메서드:
generateSummary(newsItemId, templateId?)   // 요약만 생성
generateImage(newsItemId, templateId?)     // 이미지만 생성
generateFullPost(newsItemId, options?)     // 요약 + 이미지 생성 → Post 객체 반환
createPost(newsItemId, options?)           // 생성 + DB 저장 + 뉴스 처리 완료 마킹
regenerateSummary(postId, templateId?)     // 기존 포스트 요약 재생성
regenerateImage(postId, templateId?)       // 기존 포스트 이미지 재생성
testConnection()                           // OpenAI API 연결 테스트
```

### 7.3 Twitter Service (트윗 게시)

**파일**: `electron/services/twitter/index.ts`

#### 인증 방식 (2가지)

| 방식 | 설명 | 이미지 업로드 |
|------|------|-------------|
| **OAuth 1.0a** | API Key/Secret + Access Token/Secret (앱 설정에서 직접 입력) | 지원 |
| **OAuth 2.0 PKCE** | Client ID/Secret → 브라우저 인증 → 토큰 자동 발급 | 미지원 (텍스트만) |

#### OAuth 2.0 PKCE 인증 플로우

```
1. startOAuth2Flow() 호출
2. PKCE code_verifier + state 생성
3. 로컬 HTTP 서버 시작 (port 3847)
4. 브라우저에서 Twitter 인증 페이지 열림
5. 사용자 승인 → 콜백으로 auth code 수신
6. state 파라미터 검증 (CSRF 방지)
7. auth code를 access_token + refresh_token으로 교환
8. 토큰을 DB에 암호화 저장
9. 타임아웃: 5분
```

#### 트윗 게시 플로우

```typescript
postTweet(text, imagePath?)
  │
  ├── OAuth 1.0a: v1.uploadMedia() → v2.tweet({ text, media_ids })
  └── OAuth 2.0:  ensureValidOAuth2Token() → v2.tweet({ text }) (텍스트만)

publishPost(postId)
  │
  ├── 성공: status='posted', tweet_id 저장, posted_at 기록
  └── 실패: status='failed', error_message 저장
```

#### Twitter API 에러 처리

| 상태 코드 | 원인 | 대응 |
|-----------|------|------|
| 401 | 인증 실패 | API 키 재확인 필요 |
| 402 | API 크레딧 소진 | 유료 플랜 필요 |
| 403 | 권한 부족 | 앱 권한 설정 확인 |
| 429 | 속도 제한 초과 | 포스팅 간격 늘리기 |

### 7.4 Scheduler Service (자동화)

**파일**: `electron/services/scheduler/index.ts`

node-schedule을 사용한 크론 스타일 스케줄링:

#### 뉴스 수집 스케줄

```typescript
// 기본: 6시간 간격 (0시, 6시, 12시, 18시의 정각)
// 설정: Settings 페이지에서 newsCollectionInterval (시간 단위) 변경 가능
```

#### 포스팅 스케줄

```typescript
// 기본: 3일 간격, 매일 10:00에 체크
// 플로우:
// 1. 활성 세션별로 대기 중인 포스트 확인 → 있으면 게시
// 2. 글로벌 포스트 확인 → 간격 충족 시 게시
// 3. 대기 중인 포스트 없으면 → 미처리 뉴스에서 자동 생성 후 게시
```

#### 상태 조회

```typescript
schedulerService.getStatus() → {
  newsCollectionEnabled: boolean,    // 뉴스 수집 스케줄 활성 여부
  postingEnabled: boolean,           // 포스팅 스케줄 활성 여부
  nextNewsCollection?: Date,         // 다음 뉴스 수집 시간
  nextPosting?: Date,                // 다음 포스팅 체크 시간
  lastNewsCollection?: Date,         // 마지막 뉴스 수집 시간
  lastPosting?: Date,                // 마지막 포스팅 시간
}
```

---

## 8. 프론트엔드 구조

### 8.1 라우팅 (src/App.tsx)

```typescript
<MainLayout>
  <Routes>
    <Route path="/"         element={<Dashboard />} />
    <Route path="/news"     element={<NewsPage />} />
    <Route path="/posts"    element={<PostsPage />} />
    <Route path="/sessions" element={<SessionsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Routes>
</MainLayout>
```

### 8.2 컴포넌트 계층도

```
App
└── MainLayout
    ├── TitleBar            ← 커스텀 윈도우 타이틀바 (frameless)
    ├── Sidebar             ← 좌측 네비게이션 (5개 메뉴)
    ├── Header              ← 상단 바 (스케줄러 상태, 빠른 동작)
    └── [Page Content]      ← 라우트에 따른 페이지
        ├── Dashboard       ← 통계 카드 + 최근 뉴스/포스트 + 빠른 작업
        ├── NewsPage        ← 뉴스 카드 목록 + 필터 + 포스트 생성
        ├── PostsPage       ← 대기열/히스토리 탭 + 게시/삭제
        ├── SessionsPage    ← 세션 카드 + 생성/편집 모달 + 소스 할당 모달
        └── SettingsPage    ← API 키, 스케줄, 소스, 템플릿 설정
```

### 8.3 페이지별 기능 요약

| 페이지 | 주요 기능 | 핵심 API 호출 |
|--------|----------|-------------|
| **Dashboard** | 통계 카드 4개, 최근 뉴스 5개, 최근 포스트 5개, 빠른 작업 | `app.getDashboardStats()`, `news.getList()`, `posts.getHistory()` |
| **NewsPage** | 뉴스 수집 트리거, 전체/미처리 필터, 뉴스 상세 확장, 포스트 생성 | `scheduler.triggerNewsCollection()`, `news.getList()`, `posts.create()` |
| **PostsPage** | 대기열(Queue)/히스토리(History) 탭, 즉시 게시, 삭제, 이미지 모달 | `posts.getQueue()`, `posts.getHistory()`, `posts.publishNow()` |
| **SessionsPage** | 세션 CRUD, Twitter 연결 테스트, 소스 할당/해제 | `sessions.getAllWithStats()`, `sessions.create()`, `sessions.testTwitter()` |
| **SettingsPage** | 언어/테마, API 키, OAuth2, 스케줄, 소스 관리, 템플릿 관리 | `settings.getAll()`, `settings.saveAll()`, `twitter.startOAuth2()` |

### 8.4 상태 관리

이 프로젝트는 **글로벌 상태 관리 라이브러리를 사용하지 않습니다** (zustand이 설치되어 있지만 미사용).

각 페이지가 독립적으로 `useState` + `useEffect`를 사용합니다:

```typescript
// 전형적인 페이지 패턴:
function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unprocessed'>('all');

  useEffect(() => {
    loadNews();
  }, [filter]);

  const loadNews = async () => {
    setLoading(true);
    const result = await api.news.getList({
      limit: 50,
      unprocessedOnly: filter === 'unprocessed',
    });
    if (result.success) {
      setNews(result.data);
    }
    setLoading(false);
  };
  // ...
}
```

### 8.5 스타일링

**Tailwind CSS** + 커스텀 유틸리티 클래스 조합:

```css
/* src/styles/globals.css에 정의된 주요 커스텀 클래스 */
.card          /* 카드 컨테이너 (배경, 테두리, 라운딩) */
.btn-primary   /* 주 버튼 (시안 배경) */
.btn-secondary /* 보조 버튼 (투명 배경) */
.btn-danger    /* 위험 버튼 (빨간 배경) */
.btn-ghost     /* 고스트 버튼 */
.input         /* 입력 필드 */
.badge-*       /* 배지 (success, warning, error, info) */
```

**색상 테마** (tailwind.config.js):
- Primary: 시안 계열 (#0ea5e9)
- Dark Background: #0f172a
- Dark Card: #1e293b
- Dark Border: #334155

### 8.6 다국어 지원 (i18next)

```typescript
// src/i18n/index.ts에서 설정
// 지원 언어: en (영어), ko (한국어), ja (일본어), zh (중국어)
// 기본 언어: en (fallback)
// 감지 순서: localStorage → navigator

// 사용법:
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return <h1>{t('dashboard.title')}</h1>;

  // 언어 변경:
  i18n.changeLanguage('ko');
}
```

---

## 9. 핵심 데이터 흐름 (End-to-End)

### 9.1 전체 파이프라인

```
┌──────────────────────────────────────────────────────────────────────┐
│                       뉴스 수집 → AI 처리 → Twitter 게시                │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ Sources  │    │ News     │    │ Posts    │    │ Twitter  │       │
│  │          │───►│ Items    │───►│          │───►│ API      │       │
│  │DeFiLlama│    │          │    │ GPT-4    │    │          │       │
│  │Rekt News│    │ 중복제거  │    │ DALL-E 3 │    │ 트윗 게시 │       │
│  │RSS Feed │    │ DB 저장   │    │ 콘텐츠생성│    │ 결과 기록 │       │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘       │
│       │               │               │               │              │
│  Scheduler        Scheduler       Scheduler       Scheduler         │
│  (6h 간격)        자동 트리거      자동 생성        (3일 간격)        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 단계별 상세

**1단계: 뉴스 수집**

```
스케줄러 or 수동 트리거
  │
  ├── 활성화된 소스 목록 조회 (sourceRepository.getEnabled())
  │
  ├── 소스별 수집 (소스 간 2초 딜레이):
  │   ├── DeFiLlama: API 호출 → 30일 이내 필터 → 변환
  │   ├── Rekt News: HTML 스크래핑 → cheerio 파싱 → 변환
  │   └── RSS: rss-parser로 피드 파싱 → 변환
  │
  ├── 중복 제거 (existsByExternalId 체크)
  │
  ├── DB 저장 (newsRepository.insertMany - 트랜잭션)
  │
  └── 소스의 last_fetched_at 업데이트
```

**2단계: AI 콘텐츠 생성**

```
수동 or 자동 포스트 생성 트리거
  │
  ├── 미처리 뉴스 아이템 선택
  │
  ├── 텍스트 생성 (GPT-4):
  │   ├── 템플릿 로드 → 변수 치환
  │   ├── API 호출 (max_tokens: 300, temp: 0.7)
  │   └── 결과를 news_items.summary에 저장
  │
  ├── 이미지 생성 (DALL-E 3):
  │   ├── 템플릿 로드 → 변수 치환
  │   ├── API 호출 (1024x1024, vivid)
  │   └── 로컬 파일로 다운로드 저장
  │
  ├── Post 레코드 생성 (status: 'draft' or 'scheduled')
  │
  └── 뉴스 아이템을 processed=1로 마킹
```

**3단계: Twitter 게시**

```
스케줄러 체크 or 수동 게시
  │
  ├── 세션별 포스트 확인:
  │   ├── 활성 세션 순회
  │   ├── 세션 Twitter 자격증명 로드 (암호화 복호화)
  │   ├── TwitterService 인스턴스 생성 + 설정
  │   └── publishPost(postId)
  │
  ├── 글로벌 포스트 확인:
  │   ├── 간격 조건 충족 확인 (기본 3일)
  │   ├── 대기 중 포스트 있으면 → 게시
  │   └── 없으면 → 미처리 뉴스에서 자동 생성 후 게시
  │
  └── 결과 기록:
      ├── 성공: status='posted', tweet_id 저장, posted_at 기록
      └── 실패: status='failed', error_message 저장
```

### 9.3 상태 전이 다이어그램

**NewsItem 상태**:
```
[수집됨] processed=0 → [포스트 생성됨] processed=1
```

**Post 상태**:
```
                   ┌─────────────┐
                   │   draft     │ ← 초기 생성 (AI 콘텐츠 생성 완료)
                   └──────┬──────┘
                          │ schedule()
                          ▼
                   ┌─────────────┐
              ┌────│  scheduled  │ ← 게시 시간 설정됨
              │    └──────┬──────┘
              │           │ publishPost() / 스케줄러 자동 게시
              │           ▼
              │    ┌─────────────┐
              │    │   posted    │ ← 게시 성공 (tweet_id 기록)
              │    └─────────────┘
              │
              │ publishPost() 실패 시
              ▼
       ┌─────────────┐
       │   failed     │ ← 게시 실패 (error_message 기록, 재시도 가능)
       └─────────────┘
```

---

## 10. 멀티 계정(세션) 시스템

### 10.1 개념

세션은 **독립적인 Twitter 계정 단위**입니다. 각 세션은 자체 Twitter 인증 정보와 포스팅 스케줄을 가집니다.

### 10.2 데이터 관계

```
Session 1 ("보안 뉴스 KR")
  ├── Source: DeFiLlama Hacks  ← 이 소스의 뉴스는 이 세션으로
  ├── Source: Rekt News        ← 이 소스도 이 세션으로
  ├── Post #1 (posted)
  ├── Post #2 (scheduled)
  └── Twitter: @security_kr    ← 이 계정으로 게시

Session 2 ("보안 뉴스 EN")
  ├── Source: RSS Feed         ← 별도 소스 할당
  ├── Post #3 (draft)
  └── Twitter: @security_en    ← 다른 계정으로 게시

Global (session_id = NULL)
  ├── Source: ...              ← 세션 미할당 소스
  └── Post #4 (draft)          ← 글로벌 설정의 Twitter로 게시
```

### 10.3 세션별 독립 스케줄링

각 세션은 별도의 `posting_interval`(일)과 `posting_time`(HH:MM)을 가집니다. 스케줄러는 매번 체크 시 모든 활성 세션을 순회하며 독립적으로 게시합니다.

### 10.4 자격증명 암호화

세션의 Twitter API 키는 Electron의 `safeStorage` API로 암호화됩니다:
- **Windows**: DPAPI (Data Protection API)
- **macOS**: Keychain
- **Linux**: Secret Service

---

## 11. 보안 고려사항

### 11.1 프로세스 격리

```typescript
// electron/main.ts - BrowserWindow 설정
webPreferences: {
  nodeIntegration: false,     // Node.js API 직접 접근 차단
  contextIsolation: true,     // 렌더러-프리로드 컨텍스트 분리
  webSecurity: true,          // 웹 보안 정책 활성화
  preload: path.join(__dirname, 'preload.js'),
}
```

- 렌더러 프로세스는 `window.api`를 통해서만 백엔드와 통신
- Node.js 전역 객체(`require`, `process`, `fs` 등)에 직접 접근 불가

### 11.2 민감 데이터 암호화

`settingsRepository`는 다음 키들을 자동으로 암호화/복호화합니다:

```
openaiApiKey, anthropicApiKey,
twitterApiKey, twitterApiSecret,
twitterAccessToken, twitterAccessTokenSecret,
twitterClientId, twitterClientSecret,
twitterOAuth2AccessToken, twitterOAuth2RefreshToken
```

### 11.3 API 키 마스킹

Settings 페이지에서 전체 설정 조회 시 민감 값은 `'••••••••'`로 마스킹됩니다. 저장 시 마스킹된 값은 무시되어 기존 값이 유지됩니다.

### 11.4 OAuth 2.0 PKCE 보안

- **PKCE (Proof Key for Code Exchange)**: 코드 가로채기 공격 방지
- **state 파라미터**: CSRF 공격 방지
- **토큰 자동 갱신**: 만료 5분 전 자동 refresh
- **로컬 콜백 서버**: 임시 HTTP 서버 (port 3847, 5분 타임아웃)

---

## 12. 자주 하는 개발 작업 가이드

### 12.1 새 IPC 채널 추가하기

**예시**: "템플릿 복제" 기능 추가

**Step 1**: 채널 정의 (`shared/ipc-channels.ts`)
```typescript
TEMPLATES: {
  // ... 기존 채널들
  DUPLICATE: 'templates:duplicate',  // 추가
},
```

**Step 2**: IPC 핸들러 등록 (`electron/ipc/template-handlers.ts`)
```typescript
ipcMain.handle(IPC_CHANNELS.TEMPLATES.DUPLICATE, async (_, id: number) => {
  try {
    const original = templateRepository.getById(id);
    if (!original) return { success: false, error: 'Template not found' };

    const newId = templateRepository.insert({
      name: `${original.name} (Copy)`,
      type: original.type,
      content: original.content,
      isDefault: false,
    });
    return { success: true, data: { id: newId } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Step 3**: Preload 노출 (`electron/preload.ts`)
```typescript
templates: {
  // ... 기존 메서드들
  duplicate: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.DUPLICATE, id),
},
```

**Step 4**: API 래퍼 (`src/api/index.ts`)
```typescript
templates: {
  // ... 기존 메서드들
  duplicate: (id: number) => window.api.templates.duplicate(id),
},
```

**Step 5**: UI에서 호출 (해당 페이지 컴포넌트)
```typescript
const handleDuplicate = async (id: number) => {
  const result = await api.templates.duplicate(id);
  if (result.success) {
    loadTemplates(); // 목록 새로고침
  }
};
```

### 12.2 새 뉴스 소스 추가하기

**Step 1**: BaseNewsSource를 상속한 새 클래스 생성

```typescript
// electron/services/news/my-new-source.ts
import { BaseNewsSource } from './base-source';
import type { NewsItem } from '@shared/types';

export class MyNewSource extends BaseNewsSource {
  async fetch(): Promise<Partial<NewsItem>[]> {
    // 데이터 수집 로직 구현
    const rawData = await this.fetchData();

    return rawData.map(item => this.createNewsItem({
      externalId: `mysource_${item.id}`,
      title: item.title,
      content: item.description,
      amountLost: item.loss,
      chain: item.network,
    }));
  }

  private async fetchData() { /* ... */ }
}
```

**Step 2**: NewsService의 createSourceHandler에 라우팅 추가

```typescript
// electron/services/news/index.ts
private createSourceHandler(source: NewsSource): BaseNewsSource | null {
  if (source.url.includes('my-new-source.com')) {
    return new MyNewSource(source);
  }
  // ... 기존 라우팅
}
```

**Step 3**: DB에 기본 소스 추가 (필요 시 마이그레이션)

### 12.3 새 페이지 추가하기

**Step 1**: 페이지 컴포넌트 생성 (`src/pages/MyPage.tsx`)

**Step 2**: 라우트 추가 (`src/App.tsx`)
```typescript
<Route path="/my-page" element={<MyPage />} />
```

**Step 3**: 사이드바에 네비게이션 링크 추가 (`src/components/layout/Sidebar.tsx`)

### 12.4 데이터베이스 마이그레이션 추가하기

```typescript
// electron/database/index.ts

// 1. runMigrations() 함수에 새 마이그레이션 체크 추가:
const applied004 = database.exec(
  "SELECT name FROM migrations WHERE name = '004_my_migration'"
);
if (applied004.length === 0 || applied004[0].values.length === 0) {
  applyMyMigration(database);
  database.run("INSERT INTO migrations (name) VALUES ('004_my_migration')");
}

// 2. 마이그레이션 함수 구현:
function applyMyMigration(database: Database): void {
  database.run(`
    ALTER TABLE posts ADD COLUMN my_new_column TEXT;
  `);
  // 인덱스 추가 등
}
```

> **주의**: 기존 테이블 변경 시 `ALTER TABLE`만 사용하세요. SQLite는 `DROP COLUMN`을 지원하지 않습니다.

### 12.5 새 설정 항목 추가하기

**Step 1**: 타입 정의 (`shared/types/index.ts`)
```typescript
export interface AppSettings {
  // ... 기존 필드
  myNewSetting?: string;
}
```

**Step 2**: 기본값 설정 (마이그레이션 또는 초기 마이그레이션)
```sql
INSERT OR IGNORE INTO settings (key, value) VALUES ('myNewSetting', 'default');
```

**Step 3**: 민감 데이터인 경우 `settingsRepository`의 `ENCRYPTED_KEYS`에 추가

**Step 4**: SettingsPage.tsx UI에 입력 필드 추가

---

## 13. 디버깅 & 트러블슈팅

### 13.1 로그 파일

```
위치: %APPDATA%/web3-security-news-agent/logs/
파일명: app-YYYY-MM-DD.log
형식: [2024-03-01T10:30:00.000Z] [INFO] 메시지 {"data": "..."}
보관: 기본 7일 (자동 삭제)
```

로그 레벨: `debug` → `info` → `warn` → `error`

### 13.2 DevTools 활용

개발 모드(`npm run dev`)에서는 DevTools가 자동으로 열립니다.

- **Console**: IPC 호출 결과 및 에러 확인
- **Network**: 외부 API 호출 모니터링 (OpenAI, DeFiLlama 등)
- **Application > Local Storage**: i18n 언어 설정 확인

### 13.3 자주 발생하는 문제와 해결

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| `Database not initialized` | initDatabase() 전에 쿼리 시도 | main.ts의 초기화 순서 확인 |
| DALL-E 이미지 생성 실패 | OpenAI API 키 미설정 또는 크레딧 부족 | Settings에서 API 키 확인 |
| Twitter 게시 실패 (401) | 인증 토큰 만료 또는 잘못된 키 | API 키 재설정 또는 OAuth2 재인증 |
| Twitter 게시 실패 (429) | 속도 제한 초과 | 포스팅 간격 늘리기 |
| 뉴스 수집 0건 | 이미 수집된 뉴스 (중복 필터) | external_id 기반 중복 체크 로직 확인 |
| 빌드 에러 | TypeScript strict 모드 위반 | `npm run lint`로 에러 확인 후 수정 |
| sql.js WASM 로드 실패 | 빌드 시 sql.js가 external로 설정됨 | vite.config.ts의 external 설정 확인 |

### 13.4 데이터베이스 직접 확인

sql.js는 파일 기반이므로 DB Browser for SQLite 등의 도구로 직접 열어볼 수 있습니다:
- 파일 위치: `%APPDATA%/web3-security-news-agent/web3news.db`

---

## 14. 코딩 컨벤션 & 규칙

### 14.1 TypeScript

- **strict 모드** 활성화 (`tsconfig.json`)
- `noUnusedLocals: true` — 사용하지 않는 변수 에러
- `noUnusedParameters: true` — 사용하지 않는 매개변수 에러 (접두사 `_`로 무시 가능)
- `@typescript-eslint/no-explicit-any: off` — any 타입 허용 (점진적 타입 도입)

### 14.2 경로 별칭

```typescript
// vite.config.ts에 정의된 3개 별칭
import { Something } from '@/components/...';       // → ./src/
import { IPC_CHANNELS } from '@shared/ipc-channels'; // → ./shared/
import { someUtil } from '@electron/utils/...';      // → ./electron/
```

### 14.3 IPC 응답 형식

모든 IPC 핸들러는 통일된 응답 형식을 따릅니다:

```typescript
// 성공
{ success: true, data: result }

// 실패
{ success: false, error: '에러 메시지' }
```

### 14.4 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 (컴포넌트) | PascalCase | `NewsPage.tsx`, `MainLayout.tsx` |
| 파일명 (서비스/유틸) | kebab-case | `text-generator.ts`, `news-handlers.ts` |
| IPC 채널 | kebab-case | `news:fetch-all`, `posts:publish-now` |
| 컴포넌트 | PascalCase | `function Dashboard() {}` |
| 함수/변수 | camelCase | `fetchFromSource()`, `newsService` |
| DB 컬럼 | snake_case | `amount_lost`, `created_at`, `session_id` |
| TypeScript 인터페이스 | PascalCase | `NewsItem`, `PostStatus`, `AppSettings` |
| 상수 | UPPER_SNAKE_CASE | `IPC_CHANNELS`, `ENCRYPTED_KEYS` |

### 14.5 에러 처리 패턴

```typescript
// IPC 핸들러 (표준 패턴)
ipcMain.handle(CHANNEL, async (_, params) => {
  try {
    const result = await someService.doSomething(params);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
});

// 프론트엔드 (표준 패턴)
const handleAction = async () => {
  try {
    const result = await api.something.doAction();
    if (result.success) {
      // 성공 처리
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Action failed:', error);
  }
};
```

### 14.6 ESLint 핵심 규칙

```javascript
// .eslintrc.cjs
{
  "react-refresh/only-export-components": "warn",    // 컴포넌트만 export
  "@typescript-eslint/no-explicit-any": "off",        // any 허용
  "@typescript-eslint/no-unused-vars": ["warn", {     // 미사용 변수 경고
    "argsIgnorePattern": "^_"                          // _로 시작하면 무시
  }]
}
```

---

## 부록: 빠른 참조 카드

### 주요 진입점

| 역할 | 파일 |
|------|------|
| Electron 메인 프로세스 | `electron/main.ts` |
| React 렌더러 진입점 | `src/main.tsx` |
| IPC 브릿지 | `electron/preload.ts` |
| 채널 정의 | `shared/ipc-channels.ts` |
| 공유 타입 | `shared/types/index.ts` |
| 프론트엔드 API 래퍼 | `src/api/index.ts` |
| DB 초기화 & 마이그레이션 | `electron/database/index.ts` |
| IPC 핸들러 통합 등록 | `electron/ipc/index.ts` |
| 라우팅 정의 | `src/App.tsx` |
| 레이아웃 | `src/components/layout/MainLayout.tsx` |

### 서비스 싱글톤 인스턴스

| 인스턴스 | 파일 | 역할 |
|----------|------|------|
| `newsService` | `electron/services/news/index.ts` | 뉴스 수집 |
| `aiService` | `electron/services/ai/index.ts` | AI 콘텐츠 생성 |
| `twitterService` | `electron/services/twitter/index.ts` | Twitter 게시 |
| `schedulerService` | `electron/services/scheduler/index.ts` | 자동화 스케줄링 |
| `textGenerator` | `electron/services/ai/text-generator.ts` | GPT-4 텍스트 생성 |
| `imageGenerator` | `electron/services/ai/image-generator.ts` | DALL-E 3 이미지 생성 |

### 자주 사용하는 Repository 메서드

```typescript
// 뉴스
newsRepository.getAll(limit, offset)
newsRepository.getUnprocessed(limit)
newsRepository.insertMany(items)           // 트랜잭션 사용
newsRepository.existsByExternalId(sid, eid) // 중복 체크

// 포스트
postRepository.getQueue()                  // draft + scheduled
postRepository.getHistory(limit)           // posted + failed
postRepository.markPosted(id, tweetId)     // 게시 완료 처리
postRepository.getNextScheduledBySessionId(sid)

// 설정
settingsRepository.get(key)                // 자동 복호화
settingsRepository.set(key, value)         // 자동 암호화
settingsRepository.getAll()                // 전체 설정 객체
```

---

> **문서 최종 업데이트**: 2026-03-01
> **대상 프로젝트 버전**: 1.0.0
