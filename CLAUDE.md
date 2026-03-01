# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web3 Security News Agent - An Electron desktop app that automatically collects Web3 security news (hacks, security incidents), generates AI summaries and images, and auto-posts to X (Twitter). UI language: Korean (default), English, Japanese, Chinese via i18next.

## Commands

```bash
# Install dependencies
npm install

# Development mode (starts Vite + Electron)
npm run dev

# Build for Windows
npm run build:win

# Build for all platforms
npm run build

# Lint
npm run lint
```

No test framework is configured.

## Architecture

### Process Separation (Electron)

- **Main Process** (`electron/`): Node.js backend handling database, API calls, scheduling
- **Renderer Process** (`src/`): React frontend with React Router, TailwindCSS
- **Preload** (`electron/preload.ts`): IPC bridge exposing `window.api` to renderer via `contextBridge`

The app uses a frameless window with a custom titlebar component (`src/components/layout/TitleBar.tsx`). Window controls (minimize/maximize/close) use IPC `send` (not `invoke`).

### IPC Communication

All frontend-backend communication uses typed IPC channels defined in `shared/ipc-channels.ts`. The renderer accesses backend services via `window.api.*` (see `src/api/index.ts`).

**IPC response format** - All handlers return `{ success: boolean, data?: T, error?: string }`. Handlers are registered in `electron/ipc/index.ts` and each service has its own handler file (e.g., `news-handlers.ts`, `ai-handlers.ts`).

### Key Directories

- `electron/services/` - Core business logic (singleton service instances):
  - `news/` - News collectors (DeFiLlama API, Rekt News scraper, RSS) with pluggable base class
  - `ai/` - OpenAI integration (GPT-4 summaries, DALL-E 3 images)
  - `twitter/` - Twitter API v2 posting with OAuth 1.0a and OAuth 2.0 PKCE
  - `scheduler/` - node-schedule automation (news collection + posting jobs)
- `electron/database/` - sql.js SQLite with repository pattern
- `electron/ipc/` - IPC handlers bridging services to renderer
- `src/pages/` - React pages (Dashboard, News, Posts, Settings, Sessions)
- `shared/` - Shared types (`shared/types/index.ts`) and IPC channel definitions

### Database

Uses sql.js (SQLite compiled to WebAssembly). Database stored at `userData/web3news.db`. Migrations run automatically on startup in `electron/database/index.ts`.

Key tables: `sessions`, `sources`, `news_items`, `posts`, `templates`, `settings`.

Repository classes (`electron/database/repositories/`) use shared query helpers: `queryAll<T>()`, `queryOne<T>()`, `execQuery()`, `runTransaction<T>()`.

### Encrypted Settings

The `SettingsRepository` encrypts sensitive values (API keys, tokens) using Electron's `safeStorage` API, stored as base64. Falls back to plaintext for legacy values. Encrypted keys include: `openaiApiKey`, `anthropicApiKey`, all `twitter*` credential keys.

### AI Service

Uses **OpenAI SDK** (`openai` package) for both text (GPT-4 Turbo) and image (DALL-E 3) generation. The `@anthropic-ai/sdk` package is installed but **not currently used** in any service code.

Templates support variable substitution: `{{name}}`, `{{amountLost}}`, `{{chain}}`, `{{classification}}`, `{{technique}}`. Generated images are saved locally to `userData/generated-images/`.

### Path Aliases

Configured in both `vite.config.ts` and `tsconfig.json`:
- `@` -> `./src`
- `@shared` -> `./shared`
- `@electron` -> `./electron`

### State Management

Frontend uses component-level React state (`useState`/`useEffect`) with direct `window.api` calls. Zustand is in dependencies but not currently used.

### Build Output

- `dist/` - Renderer build (HTML/CSS/JS)
- `dist-electron/` - Main + Preload build (CJS)
- `release/` - Packaged installers (via electron-builder)

### Logging

File-based logger at `electron/utils/logger.ts`. Writes to `userData/logs/app-YYYY-MM-DD.log` with daily rotation and 7-day retention.

### Multi-Account Support

Sessions allow multiple Twitter accounts. Each session can have its own Twitter credentials and posting schedule. Sources and posts can be associated with specific sessions via `session_id` foreign key.

### TypeScript

Strict mode enabled. ESLint allows `@typescript-eslint/no-explicit-any` and unused vars with leading underscore.
