# Pago Movil Manager

Sistema de gestion de pagos moviles para PyMEs venezolanas. Permite registrar pagos manualmente o escaneando comprobantes con IA (Gemini OCR), consultar estadisticas financieras y operativas, gestionar cuentas receptoras, y administrar equipos de trabajo con roles diferenciados.

## Stack

- **Frontend**: React 19, TypeScript, Vite 7, CSS Modules, Capacitor 8 (Android)
- **Backend**: Python 3.12+, FastAPI, Supabase (PostgreSQL), Google Gemini 2.5 Flash
- **Iconos**: Tabler Icons

## Requisitos previos

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Cuenta en [Supabase](https://supabase.com) (proyecto creado)
- API key de [Google AI Studio](https://aistudio.google.com/apikey) para Gemini

## Configuracion

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd pagomovil-manager
```

### 2. Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Crear `server/.env`:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
GEMINI_API_KEY=tu-api-key
```

### 3. Frontend

```bash
cd app
pnpm install
```

Crear `app/.env`:

```
VITE_SCAN_API_URL=http://127.0.0.1:8000
```

## Ejecucion

Terminal 1 (backend):

```bash
cd server
uvicorn main:app --reload
```

Terminal 2 (frontend):

```bash
cd app
pnpm dev
```

La app estara disponible en `http://localhost:5173`.

## Estructura del proyecto

```
pagomovil-manager/
  app/                          # Frontend React + Capacitor
    src/
      components/
        atoms/                  # Componentes base (Button, Input, Card, Modal...)
        molecules/              # Composiciones (PagoForm, StatCard, BankRanking...)
        organisms/              # UI compleja (NavBar, Dashboard*, Settings*)
      pages/                    # Paginas por ruta
      services/                 # Llamadas al API
      hooks/                    # Logica reutilizable
      contexts/                 # AuthContext
      types/                    # Interfaces TypeScript
  server/                       # Backend FastAPI
    routers/                    # Endpoints (auth, pagos, cuentas, scan, stats, empresas, metas)
    schemas/                    # Modelos Pydantic
    services/                   # Logica de negocio (Gemini OCR)
    rbac.py                     # Permisos por rol
    config.py                   # Clientes Supabase y Gemini
    dependencies.py             # Dependencias FastAPI (auth, empresa)
```

## Funcionalidades

- Registro y login con Supabase Auth
- Multi-empresa (hasta 3 por usuario) con roles (Dueno, Admin, Supervisor, Cajero, Contador)
- Escaneo de comprobantes con Gemini Vision (OCR + extraccion inteligente)
- Registro manual de pagos moviles
- Cuentas receptoras asociables a pagos
- Dashboard con KPIs financieros, operativos, por banco y de riesgo
- Tasa BCV del dia con conversion Bs/USD
- Tema claro, oscuro y sistema
- Exportacion de datos en JSON
- Audit log de operaciones

## Roles

| Rol | Acceso |
|---|---|
| Dueno | Total. Inmutable. Gestiona todos los roles |
| Admin | Total. Gestiona usuarios (excepto dueno) |
| Supervisor | Operaciones + ultimos 7 dias + KPIs basicos |
| Cajero | Solo hoy: escanear, registrar, confirmar pagos |
| Contador | Solo lectura. Historial completo + exportacion |

## API endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /auth/register | Crear cuenta |
| POST | /auth/login | Iniciar sesion |
| POST | /auth/reset-password | Recuperar contrasena |
| GET | /auth/me | Usuario actual + empresas |
| GET/POST | /empresas | Listar/crear empresas |
| GET/POST/PUT/DELETE | /pagos | CRUD pagos |
| GET/POST/PUT/DELETE | /cuentas | CRUD cuentas receptoras |
| POST | /scan | Escanear comprobante con IA |
| GET | /stats/summary | KPIs consolidados |
| GET | /stats/breakdown | Desglose por banco/dia/hora |
| GET | /stats/scans | Estadisticas de escaneo |
| GET/POST | /metas | Metas mensuales |
| GET/POST/PUT/DELETE | /empresas/:id/miembros | Gestion de miembros |
| POST | /empresas/:id/invitar | Invitar por email |

## Capacitor (Android)

```bash
cd app
pnpm build
npx cap sync
npx cap open android
```

## Licencia

MIT
