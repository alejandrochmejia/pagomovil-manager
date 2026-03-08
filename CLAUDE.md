# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

All application code lives under `app/`. The root of the repo is otherwise empty.

## Commands

All commands must be run from the `app/` directory.

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite HMR)
pnpm build            # Type-check + build for production (outputs to app/dist/)
pnpm lint             # Lint TypeScript/TSX files
pnpm preview          # Preview production build locally
npx cap sync          # Sync web build to native Android project (requires dist/)
```

## Stack

- **React 19** + **TypeScript 5.9** (strict mode) — UI framework
- **Vite 7** with `@vitejs/plugin-react-swc` — dev server and bundler
- **Capacitor 8** — wraps web app as Android native; config in `app/capacitor.config.ts`
- **Dexie.js 4** + `dexie-react-hooks` — IndexedDB wrapper for local storage; schema in `app/src/db/database.ts`
- **React Router 7** — hash-based routing (`createHashRouter`, required for Capacitor `file://`)
- **Recharts 3** — charts for the dashboard
- **date-fns** — date manipulation
- **CSS Modules** — scoped styles, co-located `.module.css` files
- **ESLint 9** — flat config in `app/eslint.config.js`
- **pnpm** — package manager

## Architecture

**Atomic Design pattern** — components organized as atoms → molecules → organisms → pages:

- `src/components/atoms/` — pure presentational (Button, Input, Select, Card, Modal, Badge, Spinner, EmptyState)
- `src/components/molecules/` — compositions (PagoCard, PagoForm, CuentaCard, CuentaForm, DateRangePicker, SearchBar, StatCard, ConfirmDialog, ScanPreview)
- `src/components/organisms/` — complex UI with business logic (NavBar)
- `src/pages/` — route-level components (DashboardPage, PagosPage, ScanPage, CuentasPage, SettingsPage)

**Services** (`src/services/`) — business logic separated from UI:
- `pago.service.ts` — CRUD for payments
- `cuenta.service.ts` — CRUD for receiver accounts
- `camera.service.ts` — Capacitor Camera wrapper
- `n8n.service.ts` — webhook integration for AI receipt scanning
- `stats.service.ts` — dashboard statistics aggregation
- `export.service.ts` — JSON export/import with date comparison

**Data layer** — Dexie `useLiveQuery` provides reactive data from IndexedDB; no global state manager needed. UI state is local `useState`; the only `localStorage` key is `pagomovil_last_export` (import date tracking).

**Path alias** — `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Key Types

Defined in `src/types/`:
- `Pago` — payment record (monto, banco, cedula, referencia, fecha...)
- `CuentaReceptora` — receiver account (nombre, banco, telefono, cedula)
- `DateRange`, `ExportData`, `DashboardStats`, `N8nScanResponse`

## Environment Variables

The n8n webhook URL is a **build-time** env var — it is not user-configurable at runtime.

Create `app/.env` (gitignored):
```
VITE_N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/tu-endpoint
```

Reference: `app/.env.example`. In code, read via `import.meta.env.VITE_N8N_WEBHOOK_URL` — only in `src/services/n8n.service.ts`. Never add a UI field for this value.

## Capacitor / Android

App ID is `com.example.app` (update before releasing). Camera and Filesystem plugins are installed. The Android project lives in `app/android/`.
