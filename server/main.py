from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import scan, pagos, cuentas, stats, metas

app = FastAPI(title="Pago Movil Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)
app.include_router(pagos.router)
app.include_router(cuentas.router)
app.include_router(stats.router)
app.include_router(metas.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
