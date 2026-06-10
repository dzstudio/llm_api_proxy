# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Backend dev (port 8080)
cd backend && npm run dev          # tsx watch, auto-reload

# Frontend dev (port 5173, proxies /api to localhost:8080)
cd frontend && npm run dev         # vite

# Build
cd backend && npm run build        # tsc -> dist/
cd frontend && npm run build       # vue-tsc + vite -> dist/

# Database
cd backend && npx prisma db push   # apply schema to dev DB
cd backend && npx prisma generate  # regenerate client after schema change
cd backend && npx prisma migrate dev --name <name>  # create migration

# Docker (production)
docker compose up -d --build       # build + start
docker logs llm-api-proxy       # view logs
docker exec -it llm-api-proxy sh # shell into container
```

## Architecture

### Stack

- **Backend**: Express.js + TypeScript (ESM, NodeNext resolution), Prisma ORM + SQLite, JWT auth
- **Frontend**: Vue 3 Composition API (`<script setup lang="ts">`), Pinia, Vue Router 5, TailwindCSS v4, Vite
- **Deploy**: Multi-stage Docker build (3 stages: frontend-build, backend-build, production)

### Backend Layers

```
Route -> Controller -> Service -> Prisma -> SQLite
                      ↑
                  Validator (Zod schemas)
```

All imports use `.js` extension (NodeNext module resolution). Controllers catch all errors and return structured JSON — they never throw. Services throw `Error` objects that controllers handle.

### API Response Format

Every endpoint returns: `{ code: number, message: string, data: T | null }`

- Success: `code: 0`
- Auth error: `code: 401`
- Forbidden: `code: 403`
- Not found: `code: 404`
- Server error: `code: 500`

### Auth

JWT-based. Global `authMiddleware` verifies `Authorization: Bearer <token>` on all `/api/*` paths, sets `req.userId`, `req.username`, `req.role`. Public paths (no auth required): `/api/auth/login`, `/api/health`, `/api/llm`.

- `adminGuard` — middleware that checks `role === 'ADMIN'`, returns 403. Applied at route level via `router.use(adminGuard)`.
- For routes that need both roles (e.g., conversations), role-based filtering happens inside the controller: admins see all, users see only their own data.

### LLM Gateway (core feature)

The gateway proxies AI coding tool requests to upstream LLM providers:

```
Claude Code / Cursor / Cline
  -> POST /api/llm/v1/messages (Anthropic format, x-api-key header)
  -> POST /api/llm/v1/chat/completions (OpenAI format, Authorization: Bearer)
    -> gatewayController.chatCompletions
      -> authenticateApiKey (plaintext lookup in sys_api_key)
      -> resolveModel (requested modelName -> defaultModelId -> any enabled)
      -> forwardToProvider (detect Anthropic vs OpenAI upstream format, set timeout)
      -> logConversation (persist to DB, strip <system-reminder> tags, auto-truncate >8K)
```

Key details:
- API keys are stored as `sk_llm_<24 hex chars>` in `sys_api_key.apiKey`
- Model resolution has a 3-tier fallback: requested modelName → API key's defaultModelId → any enabled model
- Anthropic responses have `content[]` array with `type: "thinking"` and `type: "text"` blocks — extract by type, not index
- `cleanUserPrompt()` strips `<system-reminder>` and `<command-name>` XML tags that Claude Code wraps around prompts

### Database

SQLite at `data/app.db` (volume-mounted, persists across container rebuilds). Key tables:

| Table | Purpose |
|---|---|
| `sys_user` | Users (ADMIN/USER role, status 1/0) |
| `sys_api_key` | API keys for gateway access (plaintext, linked to user) |
| `sys_model` | Upstream LLM model configs (baseUrl, apiKey, enabled) |
| `conversation` | Gateway conversation sessions (tied to user + model) |
| `message` | Individual messages within conversations |
| `prompt_review` | AI evaluation results for conversations |
| `daily_report` | Auto-generated daily prompt usage summaries |

### Scheduler

`node-cron` job at `00:05 daily` (`5 0 * * *`) generates `DailyReport` records for each active user who had conversations the previous day.

### Frontend Structure

- `src/stores/auth.ts` — Pinia auth store (token + userInfo)
- `src/api/` — Axios instance with baseURL `/api`, auto-attaches Bearer token, redirects to login on 401
- `src/views/` — All page components (no separate `components/` directory — logic is inline in views)
- `src/layouts/MainLayout.vue` — Sidebar + header shell, role-based nav visibility (admin vs employee paths)
- `src/router/index.ts` — Navigation guard checks token existence, redirects accordingly

### Role-Based UI

MainLayout sidebar hides admin paths for non-admin users. Admin users don't see employee paths. This mirrors the backend RBAC pattern.

### Docker Deployment

Entrypoint (`docker-entrypoint.sh`) runs `prisma migrate deploy` before starting the app. Migrations use `IF NOT EXISTS` to be safely repeatable. Database persists via volume mount `./data:/app/data`.
