from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, empresas, scan, pagos, cuentas, stats, metas, audit, scan_logs

app = FastAPI(title="Pago Movil Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(scan.router)
app.include_router(pagos.router)
app.include_router(cuentas.router)
app.include_router(stats.router)
app.include_router(metas.router)
app.include_router(audit.router)
app.include_router(scan_logs.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
