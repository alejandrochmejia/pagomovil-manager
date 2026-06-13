import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import (
    MAX_REQUEST_BYTES,
    MAX_REQUEST_MB,
    CORS_ORIGINS,
    LOG_LEVEL,
    SENTRY_DSN,
    ENVIRONMENT,
    supabase,
)
from routers import auth, empresas, scan, pagos, cuentas, stats, metas, audit, scan_logs, bcv

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("pagomovil")

# Error tracking opcional (solo se activa si hay SENTRY_DSN configurado).
if SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=SENTRY_DSN, environment=ENVIRONMENT, traces_sample_rate=0.1)
        logger.info("Sentry inicializado")
    except Exception as e:  # no romper el arranque si falla la init de Sentry
        logger.warning("No se pudo inicializar Sentry: %s", e)

app = FastAPI(title="Pago Movil Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Loguea el error completo del lado servidor y devuelve un mensaje generico
    al cliente (no se filtran detalles internos)."""
    logger.exception("Error no manejado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Rechaza payloads que excedan el limite por Content-Length, antes de
    parsear el body. Protege /scan y /pagos (que reciben imagenes en base64)."""
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            too_big = int(content_length) > MAX_REQUEST_BYTES
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Content-Length inválido"})
        if too_big:
            return JSONResponse(
                status_code=413,
                content={"detail": f"El cuerpo de la petición supera el límite de {MAX_REQUEST_MB:g} MB"},
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
    """Liveness: el proceso responde."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness: verifica conectividad real con Supabase."""
    try:
        supabase.table("bcv_rates").select("fecha").limit(1).execute()
        return {"status": "ok", "db": "ok"}
    except Exception:
        logger.exception("Readiness check fallo (Supabase)")
        return JSONResponse(status_code=503, content={"status": "unavailable", "db": "error"})
