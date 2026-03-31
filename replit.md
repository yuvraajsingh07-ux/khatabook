# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS (dark mode)
- **Frontend packages**: framer-motion, wouter, lucide-react, shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── khata-app/          # React frontend (Khata ledger app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: Khata - Payment Ledger

A mobile-first dark-themed digital khata/passbook for tracking payments between traders and their vendors/customers.

### Features
- **Multiple ledger books** — one per vendor/customer party
- **Entry types**: Cash In (credit), Bill Out (debit), Transfer (between ledgers)
- **Running balance** — updates after every entry
- **FIFO mode** — tracks payments against oldest unpaid bills first
- **Party profiles** — stores phone, UPI ID, bank details per ledger
- **PDF export** — full table with summary
- **Date-grouped entries** — clean visual grouping

### Pages
- `/` — Home: All ledgers with balances, overview stats
- `/ledger/:id` — Ledger detail: entries, FIFO status, summary strip
- `/ledger/:id/profile` — Party profile: editable contact/payment details
- `/ledger/:id/add` — Add entry form (also accessible via FAB)

### API Endpoints
- `GET /api/ledgers` — all ledgers with balances
- `POST /api/ledgers` — create ledger
- `GET /api/ledgers/:id` — single ledger
- `PATCH /api/ledgers/:id` — update ledger (name, fifoEnabled, profile)
- `DELETE /api/ledgers/:id` — delete ledger + all entries
- `GET /api/ledgers/:id/entries` — all entries (with optional date filter)
- `POST /api/ledgers/:id/entries` — create entry (handles transfer creation in both ledgers)
- `PATCH /api/ledgers/:id/entries/:entryId` — update entry
- `DELETE /api/ledgers/:id/entries/:entryId` — delete entry
- `GET /api/ledgers/:id/summary` — credit/debit/balance totals
- `GET /api/ledgers/:id/fifo-status` — FIFO bill tracking status
- `GET /api/ledgers/:id/remarks` — past remarks for autocomplete
- `GET /api/overview` — global stats across all ledgers

### Database Tables
- `ledgers` — id, name, fifo_enabled, profile (jsonb), created_at, updated_at
- `entries` — id, ledger_id, date, remark, amount, type, transfer_to_ledger_id, linked_transfer_id, fifo_remaining, balance, created_at

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/scripts run seed` — seed sample data into the database

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

### `artifacts/khata-app` (`@workspace/khata-app`)

React + Vite frontend. Dark mode only. Mobile-first layout.

- `pnpm --filter @workspace/khata-app run dev` — run the dev server
- `pnpm --filter @workspace/khata-app run build` — production Vite build

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)
- `pnpm --filter @workspace/db run push` — push schema changes

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec and Orval config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
