from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import MAX_REQUEST_BYTES, MAX_REQUEST_MB
from routers import auth, empresas, scan, pagos, cuentas, stats, metas, audit, scan_logs, bcv

app = FastAPI(title="Pago Movil Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Rechaza payloads que excedan el limite por Content-Length, antes de
    parsear el body. Protege /scan y /pagos (que reciben imagenes en base64)."""
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            too_big = int(content_length) > MAX_REQUEST_BYTES
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Content-Length invalido"})
        if too_big:
            return JSONResponse(
                status_code=413,
                content={"detail": f"El cuerpo de la peticion supera el limite de {MAX_REQUEST_MB:g} MB"},
            )
    return await call_next(request)

app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(scan.router)
app.include_router(pagos.router)
app.include_router(cuentas.router)
app.include_router(stats.router)
app.include_router(metas.router)
app.include_router(audit.router)
app.include_router(scan_logs.router)
app.include_router(bcv.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
