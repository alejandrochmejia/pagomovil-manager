# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

- `app/` — frontend React + Capacitor
- `server/` — backend Python (FastAPI + Gemini AI + Supabase)

## Commands

### Frontend (from `app/`)

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite HMR)
pnpm build            # Type-check + build for production (outputs to app/dist/)
pnpm lint             # Lint TypeScript/TSX files
pnpm preview          # Preview production build locally
npx cap sync          # Sync web build to native Android project (requires dist/)
```

### Backend (from `server/`)

```bash
pip install -r requirements.txt   # Install Python dependencies
uvicorn main:app --reload         # Start dev server on :8000
```

## Stack

- **React 19** + **TypeScript 5.9** (strict mode) — UI framework
- **Vite 7** with `@vitejs/plugin-react-swc` — dev server and bundler
- **Capacitor 8** — wraps web app as Android native; config in `app/capacitor.config.ts`
- **React Router 7** — hash-based routing (`createHashRouter`, required for Capacitor `file://`)
- **Recharts 3** — charts for the dashboard
- **date-fns** — date manipulation
- **CSS Modules** — scoped styles, co-located `.module.css` files
- **ESLint 9** — flat config in `app/eslint.config.js`
- **pnpm** — package manager
- **@tabler/icons-react** — icon library (SVG icons, no emojis)

### Backend
- **Python 3.12+** + **FastAPI** — API server (CRUD + receipt scanning)
- **Supabase** (supabase-py) — PostgreSQL database for pagos and cuentas
- **google-genai** — Gemini 2.5 Flash for OCR + intelligent data extraction
- **Pillow** — image processing

## Architecture

**Atomic Design pattern** — components organized as atoms → molecules → organisms → pages:

- `src/components/atoms/` — pure presentational (Button, Input, Select, Card, Modal, Badge, Spinner, EmptyState, ImageLightbox, NavIndicator, PageTransition)
- `src/components/molecules/` — compositions (PagoCard, PagoForm, CuentaCard, CuentaForm, DateRangePicker, SearchBar, StatCard, ConfirmDialog, ScanPreview, BcvRateBar)
- `src/components/organisms/` — complex UI with business logic (NavBar)
- `src/pages/` — route-level components (DashboardPage, PagosPage, ScanPage, CuentasPage, SettingsPage)

**Services** (`src/services/`) — business logic separated from UI:
- `api.ts` — fetch wrapper for backend API calls
- `pago.service.ts` — CRUD for payments (calls backend API)
- `cuenta.service.ts` — CRUD for receiver accounts (calls backend API)
- `camera.service.ts` — Capacitor Camera wrapper
- `scan.service.ts` — calls Python backend for OCR + Gemini receipt scanning
- `bcv.service.ts` — fetches BCV dollar rate from dolarapi.com, caches in localStorage
- `stats.service.ts` — dashboard statistics aggregation (calls backend API)
- `export.service.ts` — JSON export

**Hooks** (`src/hooks/`) — reusable stateful logic:
- `useTheme.ts` — dark/light/system theme with localStorage persistence
- `useBcvRate.ts` — reactive BCV dollar rate with refresh
- `useRouteIndex.ts` — active route index + navigation direction

**Data layer** — All data persisted in Supabase (PostgreSQL) via the Python backend API. Frontend uses `useEffect` + `useState` for data fetching. localStorage keys: `pagomovil_theme` (appearance), `pagomovil_bcv_rate` (cached BCV rate).

**Path alias** — `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Key Types

Defined in `src/types/` (snake_case to match Supabase columns):
- `Pago` — payment record (monto, banco, cedula, referencia, fecha, imagen_uri, creado_en...)
- `CuentaReceptora` — receiver account (nombre, banco, telefono, cedula, activa, creado_en)
- `DateRange`, `ExportData`, `DashboardStats`, `ScanResponse`

## Environment Variables

### Frontend — `app/.env` (gitignored, build-time)
```
VITE_SCAN_API_URL=http://localhost:8000
```
Read via `import.meta.env.VITE_SCAN_API_URL` in `src/services/api.ts`.

### Backend — `server/.env` (gitignored)
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
GEMINI_API_KEY=tu-api-key-aqui
```

## Capacitor / Android

App ID is `com.example.app` (update before releasing). Camera and Filesystem plugins are installed. The Android project lives in `app/android/`.
