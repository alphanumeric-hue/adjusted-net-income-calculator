# UK Adjusted Net Income Calculator

## Project Overview

A browser-based application that calculates UK Adjusted Net Income as defined by HMRC. Users can create accounts, input their tax details across multiple tax years, model different contribution scenarios (e.g. "what if I put more into my SIPP?"), and compare outcomes. The application runs entirely in Docker containers on a local machine.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Docker Compose                   │
│                                                  │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐  │
│  │  nginx    │   │  Go API   │   │ PostgreSQL │  │
│  │  :80      │──▶│  :8080    │──▶│  :5432     │  │
│  │           │   │           │   │            │  │
│  │  Static   │   │  REST API │   │  Named     │  │
│  │  React    │   │           │   │  Volume    │  │
│  │  Build    │   │           │   │            │  │
│  └───────────┘   └───────────┘   └───────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

Three containers orchestrated via Docker Compose:

1. **nginx** — serves the production React build as static files, proxies `/api/*` requests to the Go service
2. **Go API** — handles all business logic, tax calculations, authentication, and data persistence
3. **PostgreSQL 16** — stores user accounts and tax records with a named volume for data persistence across restarts

---

## Directory Structure

```
adjusted-net-income-calculator/
├── docker-compose.yml          # Defines the three services and pgdata volume
├── .env.example                # Environment variable reference
├── .gitignore
├── INSTRUCTIONS.md             # This file
│
├── backend/                    # Go API server
│   ├── Dockerfile              # Multi-stage: golang:1.22 build → distroless runtime
│   ├── go.mod / go.sum         # Go module dependencies
│   ├── sqlc.yaml               # sqlc code generation config
│   ├── cmd/server/main.go      # Application entry point (wiring, server start)
│   └── internal/
│       ├── config/             # Environment-based configuration
│       ├── database/
│       │   ├── migrations/     # SQL migration files (goose format)
│       │   ├── queries/        # SQL query files for sqlc
│       │   ├── generated/      # sqlc-generated Go code (do not edit manually)
│       │   └── embed.go        # Embeds migrations into the binary
│       ├── domain/             # Pure tax calculation logic (no I/O)
│       │   ├── models.go       # TaxInput, TaxResult, TaxBand structs
│       │   ├── bands.go        # Tax year thresholds and rates (data)
│       │   ├── tax.go          # Core calculation functions
│       │   └── tax_test.go     # Table-driven tests (50+ test cases)
│       ├── handler/            # HTTP handlers and middleware
│       │   ├── auth.go         # Registration, login, logout, session
│       │   ├── calculate.go    # Stateless /api/calculate endpoint
│       │   ├── tax_records.go  # CRUD endpoints for tax records
│       │   ├── middleware.go   # Logging, CORS, recovery, auth check
│       │   └── response.go    # JSON response helpers
│       └── service/            # Business logic layer
│           ├── auth.go         # User creation, password hashing, rate limiting
│           └── tax_records.go  # Tax record CRUD with calculation
│
└── frontend/                   # React + TypeScript + Vite
    ├── Dockerfile              # Multi-stage: node:20 build → nginx runtime
    ├── nginx.conf              # Reverse proxy config
    ├── package.json            # npm dependencies
    ├── vite.config.ts          # Vite config with API proxy for dev
    ├── tailwind.config.ts      # Tailwind with CSS custom property colour tokens
    └── src/
        ├── api/                # HTTP client (ky) and API functions
        ├── components/
        │   ├── ui/             # shadcn/ui-style base components
        │   ├── forms/          # Tax input form sections
        │   ├── layout/         # AppShell, TopNav, Sidebar, ThemeToggle
        │   └── results/        # Tax result display components
        ├── context/            # React context providers (Auth, Theme)
        ├── hooks/              # Custom hooks for API queries/mutations
        ├── lib/                # Utilities, Zod schemas, formatting, client-side calc
        └── pages/              # Route-level page components
```

---

## Backend Layers

### Domain Layer (`internal/domain/`)

Pure Go functions with zero I/O dependencies. All monetary values are `int64` pence. Tax year bands are data structs, not code — adding a new tax year means adding a new struct entry.

Key functions:
- `GrossIncome()` — sums all income sources after salary sacrifice
- `AdjustedNetIncome()` — gross income minus qualifying deductions
- `PersonalAllowance()` — applies PA tapering (£1 reduction per £2 above £100k)
- `IncomeTax()` — calculates tax across basic/higher/additional rate bands
- `NationalInsurance()` — Class 1 NI (8% below UEL, 2% above)
- `HICBC()` — High Income Child Benefit Charge (1% per £200 above £60k)
- `Calculate()` — orchestrates all calculations into a complete `TaxResult`

### Service Layer (`internal/service/`)

Business logic between HTTP handlers and the database. Handles:
- Password hashing/verification with bcrypt (cost factor 12)
- Rate limiting login attempts (5/min per email)
- Creating tax records with automatic calculation
- Duplicating scenarios with recalculation
- Ownership checks (users can only access their own records)

### Handler Layer (`internal/handler/`)

HTTP request handlers using Go 1.22's `net/http` pattern routing. Includes:
- JSON response helpers with consistent error format: `{"error": "msg", "code": "CODE"}`
- Middleware chain: logging → recovery → CORS → route handlers
- `RequireAuth` middleware that checks gorilla/sessions cookie and injects user ID into context

### Database Layer (`internal/database/`)

- **Migrations** — SQL files in goose format, embedded into the binary via `//go:embed`
- **Queries** — SQL files processed by sqlc to generate type-safe Go code
- **Generated** — sqlc output (models, query functions). Do not edit manually; regenerate with `sqlc generate`

---

## Frontend Layers

### API Layer (`src/api/`)

- `client.ts` — configured ky instance with `/api` prefix and credential handling
- `auth.ts` — login, register, logout, session check functions
- `tax-records.ts` — CRUD operations, stateless calculate, tax year queries

### Components (`src/components/`)

- **ui/** — Base components (Button, Input, Card, Tabs, Dialog, Select, Label) styled with CSS custom properties
- **forms/** — Tax input sections (IncomeSection, PensionSection, DeductionsSection, ScenarioComparison)
- **results/** — Tax result display (ResultsPanel, SummaryCards, TaxBandBreakdown)
- **layout/** — AppShell (sidebar + content), TopNav, Sidebar (tax year list), ThemeToggle

### Context (`src/context/`)

- `AuthContext` — calls GET /api/auth/session on mount, provides `user`, `login()`, `register()`, `logout()`
- `ThemeContext` — reads/writes `localStorage('theme')`, applies `.dark` class, cycles Light → Dark → System

### Hooks (`src/hooks/`)

TanStack Query wrappers for all API operations with automatic cache invalidation on mutations.

### Lib (`src/lib/`)

- `schemas.ts` — Zod schemas for all domain types; TypeScript types derived via `z.infer<>`
- `format.ts` — pence/pounds conversion and formatting helpers
- `tax-calc.ts` — client-side calculation preview (mirrors server logic for real-time feedback)
- `utils.ts` — `cn()` for Tailwind class merging

---

## How to Run

No local toolchain (Go, Node, npm) is required. Everything runs inside Docker.

### Quick Start (End Users)

Use this if you want to run the app using pre-built images from GitHub Container Registry.

```bash
# 1. Clone the repository
git clone https://github.com/alphanumeric-hue/adjusted-net-income-calculator.git
cd adjusted-net-income-calculator

# 2. Set up environment
cp .env.example .env
# Edit .env — at minimum, change SESSION_SECRET to a long random string

# 3. Remove the development override file so pre-built images are used
mv docker-compose.override.yml docker-compose.override.yml.bak

# 4. Pull images and start
docker compose up -d

# Access at http://localhost
# Stop (data persists in pgdata volume)
docker compose down

# Stop and destroy all data
docker compose down -v
```

**Podman users:**
```bash
cp .env.example .env
# Edit SESSION_SECRET in .env
podman-compose -f podman-compose.yml up -d
```

---

### Quick Start (Development — Build from Source)

Use this if you are contributing to the project or want to build the images locally.

Docker Compose automatically merges `docker-compose.yml` with `docker-compose.override.yml` when both are present. The override file adds `build:` directives so images are built from source, and exposes the API port directly for debugging.

```bash
# 1. Clone the repository
git clone https://github.com/alphanumeric-hue/adjusted-net-income-calculator.git
cd adjusted-net-income-calculator

# 2. Set up environment
cp .env.example .env

# 3. Build and start (tests run automatically during build)
docker compose up --build

# Access the application at http://localhost
# Direct API access at http://localhost:8080/api/health

# Stop all containers (data persists)
docker compose down

# Stop and remove all data
docker compose down -v
```

To temporarily use pre-built images during development without deleting the override file:
```bash
docker compose pull
docker compose up  # uses pulled images, skips build
```

---

### Local Development Without Docker (optional, requires Go 1.22+ and Node 20+)

```bash
# 1. Start Postgres
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=taxapp \
  -e POSTGRES_PASSWORD=taxapp \
  -e POSTGRES_DB=taxapp \
  postgres:16-alpine

# 2. Start the Go API
cd backend
go mod tidy
export DATABASE_URL="postgres://taxapp:taxapp@localhost:5432/taxapp?sslmode=disable"
export SESSION_SECRET="dev-secret-change-me"
go run ./cmd/server

# 3. Start the frontend dev server (in a new terminal)
cd frontend
npm install
npm run dev
# Open http://localhost:5173 (Vite proxies /api to localhost:8080)
```

---

## How to Run Tests

Tests run automatically during `docker compose build`. Both Dockerfiles use multi-stage builds where the test stage must pass before the build stage proceeds. No test artifacts or dev dependencies are included in the final production images.

### Via Docker (recommended — no local toolchain needed)

```bash
# Run backend tests only
docker build --target test ./backend

# Run frontend tests only
docker build --target test ./frontend

# Run all tests (as part of a full build)
docker compose build
```

### Locally (requires Go 1.22+ / Node 20+)

```bash
# Backend
cd backend && go mod tidy && go test ./...

# Frontend
cd frontend && npm install && npm test
```

---

## How to Build

```bash
# Build all Docker images (tests included)
docker compose build

# Or with Podman
podman-compose -f podman-compose.yml build
```

---

## Creating a Release (Repo Owner)

Releases are triggered automatically when a PR is merged into `main` with a release label. The version is bumped based on the label, a git tag is created, and the full release pipeline runs. Work usually occurs on `dev` before being merged to `main`

### Release workflow

1. Create a branch from `main`, do your work, open a PR
2. Add one of these labels to the PR:
   - `release:patch` — bug fixes, small changes (e.g. `v1.0.0` → `v1.0.1`)
   - `release:minor` — new features, backwards-compatible (e.g. `v1.0.0` → `v1.1.0`)
   - `release:major` — breaking changes (e.g. `v1.0.0` → `v2.0.0`)
3. Merge the PR — GitHub Actions automatically:
   - Calculates the next version from the latest tag
   - Creates and pushes the new git tag
   - Builds and pushes Docker images to ghcr.io
   - Creates a GitHub Release with `docker-compose.yml` and `.env.example` attached

PRs merged without a release label are deployed to no-one — no release is created.

This automatically publishes:
- `ghcr.io/alphanumeric-hue/adjusted-net-income-calculator/frontend:1.0.0` (also tagged `:1.0`, `:1`, `:latest`)
- `ghcr.io/alphanumeric-hue/adjusted-net-income-calculator/api:1.0.0` (also tagged `:1.0`, `:1`, `:latest`)

**First release only:** After the first publish, go to the GitHub repository → Packages → each package → Package settings, and change visibility to **Public** so end users can pull without authentication.

---

## How to Regenerate sqlc Code

After modifying any SQL files in `backend/internal/database/queries/` or `backend/internal/database/migrations/`:

```bash
cd backend
sqlc generate
```

This regenerates all files in `backend/internal/database/generated/`. Do not edit those files manually.

---

## Database Migrations

Migrations run automatically on server startup via goose's programmatic API. The SQL files in `backend/internal/database/migrations/` are embedded in the Go binary.

To run migrations manually:

```bash
goose -dir backend/internal/database/migrations \
  postgres "postgres://taxapp:taxapp@localhost:5432/taxapp?sslmode=disable" up
```

---

## Environment Variables

| Variable         | Default                                                    | Description                              |
|------------------|------------------------------------------------------------|------------------------------------------|
| `DATABASE_URL`   | `postgres://taxapp:taxapp@db:5432/taxapp?sslmode=disable`  | PostgreSQL connection string             |
| `SESSION_SECRET` | `change-me-in-production`                                  | Secret key for encrypting session cookies |
| `BCRYPT_COST`    | `12`                                                       | bcrypt cost factor for password hashing  |
| `CORS_ORIGIN`    | `http://localhost`                                         | Allowed CORS origin                      |
| `PORT`           | `8080`                                                     | API server port                          |

---

## Tax Calculation Logic

The domain layer calculates Adjusted Net Income per HMRC rules:

1. **Gross Income** = Employment (after salary sacrifice) + Self-Employment + Savings + Dividends + Rental + Other
2. **Adjusted Net Income** = Gross Income − SIPP contributions − Gift Aid − Trading losses
3. **Personal Allowance** = £12,570, tapered by £1 for every £2 of ANI above £100,000
4. **Income Tax** = (Gross − PA) taxed at Basic (20%), Higher (40%), Additional (45%)
5. **National Insurance** = 8% between PT and UEL, 2% above UEL
6. **HICBC** = 1% of annual child benefit per £200 of ANI above £60,000

### Adding a New Tax Year

1. Add a new `TaxYearBands` struct in `backend/internal/domain/bands.go`
2. Add the entry to the `AllTaxYearBands` map
3. Update the corresponding client-side bands in `frontend/src/lib/tax-calc.ts`
4. Add the new year to the tax year select dropdown in the frontend

---

## API Reference

| Method | Endpoint                             | Auth | Description                                    |
|--------|--------------------------------------|------|------------------------------------------------|
| GET    | `/api/health`                        | No   | Health check                                   |
| POST   | `/api/auth/register`                 | No   | Create account (sets session cookie)           |
| POST   | `/api/auth/login`                    | No   | Authenticate (sets session cookie)             |
| POST   | `/api/auth/logout`                   | No   | Clear session                                  |
| GET    | `/api/auth/session`                  | Yes  | Check current session, return user info        |
| POST   | `/api/calculate`                     | No   | Stateless tax calculation (no persistence)     |
| GET    | `/api/tax-records`                   | Yes  | List all records (optional `?year=` filter)    |
| POST   | `/api/tax-records`                   | Yes  | Create a new tax record                        |
| GET    | `/api/tax-records/{id}`              | Yes  | Get a specific record with calculation result  |
| PUT    | `/api/tax-records/{id}`              | Yes  | Update a record (recalculates)                 |
| DELETE | `/api/tax-records/{id}`              | Yes  | Delete a record                                |
| POST   | `/api/tax-records/{id}/duplicate`    | Yes  | Duplicate a record with a new label            |
| GET    | `/api/tax-years`                     | Yes  | List user's tax years with summary stats       |
| GET    | `/api/tax-years/available`           | Yes  | List tax years not yet created by user         |

### Error Response Format

All API errors return a consistent JSON structure:

```json
{
  "error": "human readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Authentication Errors

Registration and login errors use generic messages to prevent email enumeration:
- Registration failure: `"unable to create account"`
- Login failure: `"invalid credentials"`
