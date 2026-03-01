<p align="center">
  <h1 align="center">Web3 Security News Agent</h1>
  <p align="center">
    Web3 보안 사고를 자동 수집하고, AI로 전문 뉴스 콘텐츠를 생성하여 X(Twitter)에 자동 게시하는 데스크톱 애플리케이션
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

**Web3 Security News Agent**는 DeFi/Web3 생태계에서 발생하는 해킹, 익스플로잇 등 보안 사고를 실시간으로 모니터링하고, GPT-4 기반의 전문 저널리스트 스타일 요약과 DALL-E 3 이미지를 자동 생성하여 X(Twitter)에 게시하는 **올인원 자동화 도구**입니다.

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Source Collection** | DeFiLlama Hacks API, Rekt News 스크래핑, RSS 피드에서 보안 사고 자동 수집 |
| **AI Content Generation** | GPT-4 Turbo로 Bloomberg/Reuters 스타일 트윗 작성, DALL-E 3로 뉴스 일러스트 생성 |
| **Automated Posting** | 설정 가능한 간격(기본 3일)으로 X(Twitter)에 자동 게시 |
| **Multi-Account** | 세션 시스템을 통한 다중 Twitter 계정 독립 운영 |
| **Dual Auth** | Twitter OAuth 1.0a (이미지 포함) 및 OAuth 2.0 PKCE 동시 지원 |
| **Smart Scheduling** | node-schedule 기반 뉴스 수집(기본 6h) 및 포스팅 자동화 |
| **i18n** | 한국어, 영어, 일본어, 중국어 UI 지원 |
| **System Tray** | 창 닫아도 백그라운드 실행 유지, 트레이에서 빠른 작업 |

---

## Tech Stack

```
Frontend    : React 18 · TypeScript 5.3 · Tailwind CSS 3.4 · React Router 6 · Lucide Icons
Backend     : Electron 40 · Node.js
Build       : Vite 7 · electron-builder · vite-plugin-electron
Database    : sql.js (SQLite WASM) — 네이티브 빌드 불필요
AI          : OpenAI SDK (GPT-4 Turbo + DALL-E 3)
Twitter     : twitter-api-v2 (OAuth 1.0a / OAuth 2.0 PKCE)
Scraping    : axios · cheerio · rss-parser
Scheduling  : node-schedule
i18n        : i18next · react-i18next
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x (LTS 권장)
- **npm** >= 9.x
- **Git**

### Installation

```bash
# 1. 저장소 클론
git clone <repository-url>
cd Newslatter_app

# 2. 의존성 설치
npm install
```

> sql.js는 WebAssembly 기반이므로 네이티브 모듈 재빌드가 필요 없습니다.

### Environment Variables

프로젝트 루트에 `.env` 파일을 생성합니다 (`.env.example` 참고):

```env
# OpenAI API Key (GPT-4 요약 + DALL-E 3 이미지 생성)
OPENAI_API_KEY=sk-your-openai-api-key

# Twitter API (OAuth 1.0a)
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret

# (Optional) Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

> API 키는 앱 실행 후 **Settings** 페이지에서도 입력할 수 있으며, SQLite DB에 플랫폼 암호화(DPAPI/Keychain)로 안전하게 저장됩니다.

### Run (Development)

```bash
npm run dev
```

Vite 핫 리로드 + Electron이 동시에 실행되며, DevTools가 자동으로 열립니다.

### Build (Production)

```bash
# Windows 설치 파일(.exe) 생성
npm run build:win

# 전체 플랫폼 (Windows / macOS / Linux)
npm run build
```

빌드 결과물은 `release/` 디렉토리에 생성됩니다.

### Other Commands

```bash
npm run lint       # ESLint 검사
npm run preview    # 프로덕션 빌드 미리보기
```

---

## API Keys Setup

### OpenAI

1. [OpenAI Platform](https://platform.openai.com/)에서 계정 생성
2. API Keys 페이지에서 새 키 발급
3. GPT-4 및 DALL-E 3 접근 권한 필요 (유료 플랜)

### Twitter (X)

1. [Twitter Developer Portal](https://developer.twitter.com/)에서 앱 생성
2. 앱 권한을 **Read and Write**로 설정
3. 인증 방식 선택:

| 방식 | 필요 정보 | 이미지 업로드 |
|------|----------|:------------:|
| **OAuth 1.0a** | API Key, API Secret, Access Token, Access Token Secret | O |
| **OAuth 2.0 PKCE** | Client ID, Client Secret → 앱 내 브라우저 인증 | X |

---

## Usage

### Dashboard
전체 통계(수집된 뉴스 수, 예약/게시된 포스트 수)를 한눈에 확인하고 빠른 작업을 실행합니다.

### News
수집된 보안 사고 목록을 확인합니다. 각 뉴스에서 프로토콜명, 피해 금액, 체인, 공격 유형 등을 확인하고 포스트를 생성할 수 있습니다.

### Posts
- **Queue**: AI가 생성한 대기 중인 포스트 (draft/scheduled) 관리
- **History**: 게시 완료 또는 실패한 포스트 확인, 재시도

### Sessions
다중 Twitter 계정을 세션 단위로 관리합니다. 각 세션에 독립적인 Twitter 인증, 포스팅 스케줄, 뉴스 소스를 할당할 수 있습니다.

### Settings
- API 키 설정 및 연결 테스트
- Twitter OAuth 2.0 인증
- 뉴스 수집 간격, 포스팅 간격/시간 설정
- 뉴스 소스 활성화/비활성화
- AI 프롬프트 템플릿 관리
- 언어/테마 설정

---

## Project Structure

```
├── electron/                   # Main Process (Node.js 백엔드)
│   ├── main.ts                # 앱 진입점 · 윈도우 · 트레이 · 라이프사이클
│   ├── preload.ts             # IPC 브릿지 (window.api 노출)
│   ├── database/              # sql.js 초기화 · 마이그레이션 · 쿼리 헬퍼
│   │   └── repositories/     # Repository 패턴 데이터 접근 (6개 모듈)
│   ├── services/              # 비즈니스 로직
│   │   ├── news/             # 뉴스 수집 (DeFiLlama · Rekt · RSS)
│   │   ├── ai/               # AI 콘텐츠 생성 (GPT-4 · DALL-E 3)
│   │   ├── twitter/          # Twitter API (OAuth 1.0a / 2.0 PKCE)
│   │   └── scheduler/       # 자동화 스케줄러 (node-schedule)
│   ├── ipc/                   # IPC 핸들러 (10개 도메인)
│   └── utils/                 # 로거 등 유틸리티
│
├── src/                        # Renderer Process (React 프론트엔드)
│   ├── App.tsx                # 라우팅 (5개 페이지)
│   ├── api/                   # window.api 래퍼
│   ├── pages/                 # Dashboard · News · Posts · Sessions · Settings
│   ├── components/layout/     # MainLayout · TitleBar · Sidebar · Header
│   ├── styles/                # Tailwind CSS + 커스텀 유틸리티
│   └── i18n/                  # 다국어 설정 (ko · en · ja · zh)
│
├── shared/                     # Main ↔ Renderer 공유
│   ├── ipc-channels.ts        # IPC 채널명 상수 (50+)
│   └── types/index.ts         # 공유 TypeScript 인터페이스 (20+)
│
├── vite.config.ts              # Vite + Electron 빌드 설정
├── tailwind.config.js          # Tailwind 테마 (다크 모드)
├── electron-builder.json       # 패키징 설정 (NSIS · DMG · AppImage)
├── tsconfig.json               # TypeScript (Renderer)
└── tsconfig.node.json          # TypeScript (Main Process)
```

### Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@` | `./src` | `import X from '@/components/...'` |
| `@shared` | `./shared` | `import { IPC_CHANNELS } from '@shared/ipc-channels'` |
| `@electron` | `./electron` | `import { logger } from '@electron/utils/logger'` |

---

## Architecture

```
┌─────────────────┐         IPC          ┌──────────────────────┐
│ Renderer Process │◄──── (preload) ────►│   Main Process        │
│                  │                      │                       │
│  React 18        │   contextBridge      │  Services             │
│  React Router    │   ipcRenderer ◄──►  │  ├─ NewsService       │
│  Tailwind CSS    │   .invoke()          │  ├─ AIService         │
│  i18next         │                      │  ├─ TwitterService    │
│                  │                      │  └─ SchedulerService  │
│  Pages ──► API   │                      │                       │
│  Layer    Layer   │                      │  Database (sql.js)    │
└─────────────────┘                      │  └─ Repositories      │
                                          └──────────────────────┘
```

**Data Pipeline**:
```
News Sources ──► News Items ──► AI Generation ──► Posts ──► Twitter API
(DeFiLlama)      (DB 저장)       (GPT-4 요약)     (대기열)    (자동 게시)
(Rekt News)      (중복 제거)     (DALL-E 이미지)  (스케줄링)
(RSS Feeds)
```

---

## Data Storage

| Item | Location |
|------|----------|
| SQLite Database | `%APPDATA%/web3-security-news-agent/web3news.db` |
| Generated Images | `%APPDATA%/web3-security-news-agent/generated-images/` |
| Log Files | `%APPDATA%/web3-security-news-agent/logs/app-YYYY-MM-DD.log` |

---

## Dependencies

### Production

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI 프레임워크 |
| `react-router-dom` | 클라이언트 사이드 라우팅 |
| `openai` | GPT-4 요약 + DALL-E 3 이미지 생성 |
| `@anthropic-ai/sdk` | Claude AI (대체 AI 옵션) |
| `twitter-api-v2` | Twitter API v2 게시 |
| `sql.js` | SQLite WASM 데이터베이스 (네이티브 빌드 불필요) |
| `axios` | HTTP 클라이언트 |
| `cheerio` | HTML 파싱 (Rekt News 스크래핑) |
| `rss-parser` | RSS 피드 파싱 |
| `node-schedule` | 크론 스타일 작업 스케줄링 |
| `electron-store` | Electron 영구 저장소 |
| `i18next`, `react-i18next` | 다국어 지원 |
| `lucide-react` | 아이콘 라이브러리 |
| `zustand` | 상태 관리 (설치됨, 향후 확장용) |
| `p-queue` | 동시성 제어 큐 |

### Development

| Package | Purpose |
|---------|---------|
| `electron` | 데스크톱 앱 프레임워크 |
| `electron-builder` | 앱 패키징 및 배포 |
| `vite` | 빌드 도구 + 개발 서버 |
| `vite-plugin-electron` | Vite-Electron 통합 |
| `typescript` | 정적 타입 시스템 |
| `tailwindcss`, `postcss`, `autoprefixer` | CSS 툴체인 |
| `eslint`, `@typescript-eslint/*` | 코드 린팅 |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm install` 실패 | Node.js 18+ 확인. `node -v`로 버전 체크 |
| DevTools 안 열림 | `npm run dev`로 실행했는지 확인 (프로덕션 빌드에서는 비활성) |
| Twitter 게시 실패 (401) | API 키 재확인, Developer Portal에서 앱 권한 Read+Write 확인 |
| Twitter 게시 실패 (429) | 속도 제한 초과. Settings에서 포스팅 간격 늘리기 |
| DALL-E 이미지 생성 실패 | OpenAI 크레딧 확인, API 키 유효성 확인 |
| DB 관련 에러 | `%APPDATA%/web3-security-news-agent/web3news.db` 파일 확인 |

---

## Documentation

상세한 아키텍처, 코드 구조, 개발 가이드는 [온보딩 문서](docs/ONBOARDING.md)를 참조하세요.

---

## License

[MIT](LICENSE)
