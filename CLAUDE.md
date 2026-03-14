# CLAUDE.md — UK Adjusted Net Income Calculator

## Project Overview

A browser-based UK Adjusted Net Income calculator per HMRC rules. Users create accounts, input tax details across multiple years, model "what-if" scenarios (e.g. increased SIPP contributions), and compare outcomes. Runs entirely in Docker containers locally.

## Architecture

Three Docker containers orchestrated via Docker/Podman Compose:

- **frontend** (nginx) — serves static React build, proxies `/api/*` to the Go API
- **api** (Go) — business logic, tax calculations, authentication, data persistence
- **db** (PostgreSQL 16) — user accounts and tax records, persisted via named volume

## Quick Start

```bash
# Development — builds from source (docker-compose.override.yml auto-merges)
cp .env.example .env
docker compose up --build

# Access at http://localhost
# API at http://localhost:8080/api/health (direct, exposed by override)

# Stop (data persists)
docker compose down

# Stop and destroy data
docker compose down -v
```

For Podman users: replace `docker compose` with `podman-compose` using `podman-compose.yml`.

**Using pre-built images** (end-user mode): rename or delete `docker-compose.override.yml`, then `docker compose up -d`. Docker Compose will pull images from `ghcr.io/alphanumeric-hue/adjusted-net-income-calculator/`.

**Releasing**: Add a `release:major`, `release:minor`, or `release:patch` label to a PR before merging to `main`. The version is auto-bumped, tagged, and the release pipeline runs. PRs without a release label do not trigger a release.

## Build & Test

Tests are embedded in the multi-stage Docker builds — they run automatically during `docker compose build`. No local toolchain is required.

To run tests in isolation without building the final image:

```bash
# Backend tests only (target the test stage)
docker build --target test ./backend

# Frontend tests only (target the test stage)
docker build --target test ./frontend
```

## Directory Structure

```
adjusted-net-income-calculator/
├── docker-compose.yml           # Production/end-user compose (references ghcr.io images)
├── docker-compose.override.yml  # Development overrides (build from source, auto-merged)
├── podman-compose.yml           # Podman Compose equivalent
├── .github/workflows/release.yml # GitHub Actions: build + push on git tag v*
├── .env.example                 # Environment variable reference
├── backend/                  # Go API server
│   ├── cmd/server/main.go    # Entry point, wiring, graceful shutdown
│   └── internal/
│       ├── config/           # Environment-based configuration
│       ├── database/         # Migrations, queries, sqlc-generated code
│       ├── domain/           # Pure tax calculation logic (no I/O)
│       ├── handler/          # HTTP handlers and middleware
│       └── service/          # Business logic layer
└── frontend/                 # React + TypeScript + Vite
    └── src/
        ├── api/              # HTTP client (ky) and API functions
        ├── components/       # UI, forms, results, layout components
        ├── context/          # Auth and Theme providers
        ├── hooks/            # TanStack Query wrappers
        ├── lib/              # Schemas, formatting, client-side calc
        └── pages/            # Route-level page components
```

## Code Conventions

### General

- Every function/method has a descriptive comment on the line immediately preceding its definition
- No hardcoded colour values — all colours use CSS custom property tokens
- All monetary values are `int64` pence (Go) or `number` in pence (TypeScript), never floats

### Backend (Go)

- **Go 1.22** with `net/http` pattern routing — no external framework
- **Layered architecture**: handler → service → domain, with domain having zero I/O dependencies
- **Database**: pgx/v5 connection pool, sqlc for type-safe query generation, goose for migrations
- **Auth**: gorilla/sessions with HttpOnly cookies, bcrypt (cost 12), in-memory rate limiting
- **Error format**: `{"error": "message", "code": "MACHINE_READABLE_CODE"}` — consistent across all endpoints
- **Migrations**: SQL files embedded in the binary via `//go:embed`, run automatically on startup

### Frontend (React/TypeScript)

- **React 18** + **TypeScript 5** (strict mode) + **Vite 5**
- **Styling**: Tailwind CSS v3 with CSS custom property colour tokens, `darkMode: 'class'`
- **Forms**: React Hook Form + Zod resolver for validation
- **Server state**: TanStack Query v5 with automatic cache invalidation on mutations
- **HTTP client**: ky with `/api` prefix and `credentials: 'include'`
- **Component library**: shadcn/ui-style components in `src/components/ui/`
- **Financial display**: `tabular-nums` on all monetary figures, formatted via `src/lib/format.ts`

### File Naming

- Go: `snake_case.go`
- React components: `PascalCase.tsx`
- TypeScript utilities: `kebab-case.ts`
- SQL migrations: `NNN_description.sql`

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/internal/domain/tax.go` | Core HMRC tax calculation logic (pure functions) |
| `backend/internal/domain/bands.go` | Tax year thresholds and rates (data, not code) |
| `backend/internal/domain/tax_test.go` | 50+ table-driven test cases |
| `backend/cmd/server/main.go` | Server wiring, route registration, graceful shutdown |
| `frontend/src/lib/schemas.ts` | Zod schemas — all TypeScript types derive from these |
| `frontend/src/lib/tax-calc.ts` | Client-side calculation preview (mirrors Go domain) |
| `frontend/src/index.css` | CSS custom property colour tokens (light + dark) |

## Adding a New Tax Year

1. Add a `TaxYearBands` struct in `backend/internal/domain/bands.go` and register it in `AllTaxYearBands`
2. Add matching bands data in `frontend/src/lib/tax-calc.ts`
3. Add test cases in `backend/internal/domain/tax_test.go`
4. The new year automatically appears in the frontend dropdowns

## Database

- **Migrations** run automatically on server startup via goose (embedded SQL)
- **Schema**: `users` table (UUID PK, email, bcrypt hash) and `tax_records` table (UUID PK, user FK, JSONB input/result data)
- **sqlc**: queries in `backend/internal/database/queries/`, generated code in `backend/internal/database/generated/` — do not edit generated files manually
- To regenerate after modifying SQL: `cd backend && sqlc generate`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://taxapp:taxapp@db:5432/taxapp?sslmode=disable` | PostgreSQL connection string |
| `SESSION_SECRET` | `change-me-in-production` | Cookie encryption key |
| `BCRYPT_COST` | `12` | bcrypt hash cost factor |
| `CORS_ORIGIN` | `http://localhost` | Allowed CORS origin |
| `PORT` | `8080` | API server listen port |
| `POSTGRES_USER` | `taxapp` | PostgreSQL username (used by db container) |
| `POSTGRES_PASSWORD` | `taxapp` | PostgreSQL password (used by db container) |
| `POSTGRES_DB` | `taxapp` | PostgreSQL database name (used by db container) |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/calculate` | No | Stateless tax calculation |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Authenticate |
| POST | `/api/auth/logout` | No | Clear session |
| GET | `/api/auth/session` | Yes | Current session info |
| GET | `/api/tax-records` | Yes | List records (`?year=` filter) |
| POST | `/api/tax-records` | Yes | Create record |
| GET | `/api/tax-records/{id}` | Yes | Get single record |
| PUT | `/api/tax-records/{id}` | Yes | Update record |
| DELETE | `/api/tax-records/{id}` | Yes | Delete record |
| POST | `/api/tax-records/{id}/duplicate` | Yes | Duplicate as new scenario |
| GET | `/api/tax-years` | Yes | User's tax years with summaries |
| GET | `/api/tax-years/available` | Yes | Tax years not yet created |

## Troubleshooting

- **Port 80 in use**: Change the frontend port mapping in `docker-compose.yml` (e.g. `"8000:80"`)
- **Database connection refused**: The API waits for the `db` healthcheck — if it still fails, check that port 5432 isn't occupied by a local Postgres
- **Stale data after schema changes**: Run `docker compose down -v` to wipe the volume, then rebuild
