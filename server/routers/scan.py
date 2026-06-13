import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from config import (
    supabase,
    SCAN_RATE_PER_MIN,
    SCAN_RATE_PER_DAY,
    MAX_IMAGE_BYTES,
    MAX_IMAGE_MB,
)
from rbac import require_permission
from schemas.scan import ScanRequest
from services.gemini import decode_image, call_gemini, parse_scan_result, ImageTooLarge

logger = logging.getLogger(__name__)

router = APIRouter()


def _check_scan_quota(empresa_id: int) -> None:
    """Aplica una cuota por empresa para limitar el costo de Gemini.
    Cuenta los escaneos registrados en scan_logs en las ventanas de 1 min y 24 h."""
    now = datetime.now(timezone.utc)

    minute_ago = (now - timedelta(minutes=1)).isoformat()
    per_min = (
        supabase.table("scan_logs")
        .select("id", count="exact")
        .eq("empresa_id", empresa_id)
        .gte("scan_started_at", minute_ago)
        .execute()
    )
    if (per_min.count or 0) >= SCAN_RATE_PER_MIN:
        raise HTTPException(
            status_code=429,
            detail="Demasiados escaneos por minuto. Intenta de nuevo en un momento.",
            headers={"Retry-After": "60"},
        )

    day_ago = (now - timedelta(days=1)).isoformat()
    per_day = (
        supabase.table("scan_logs")
        .select("id", count="exact")
        .eq("empresa_id", empresa_id)
        .gte("scan_started_at", day_ago)
        .execute()
    )
    if (per_day.count or 0) >= SCAN_RATE_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"Límite diario de {SCAN_RATE_PER_DAY} escaneos alcanzado para esta empresa.",
            headers={"Retry-After": "3600"},
        )


@router.post("/scan")
async def scan_receipt(req: ScanRequest, ctx: dict = Depends(require_permission("scan"))):
    empresa_id = ctx["empresa_id"]

    # 1) Validar la imagen (tamano y formato) antes de consumir cuota o llamar a Gemini.
    try:
        img = decode_image(req.image, max_bytes=MAX_IMAGE_BYTES)
    except ImageTooLarge:
        raise HTTPException(
            status_code=413,
            detail=f"La imagen supera el límite de {MAX_IMAGE_MB:g} MB",
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen inválida")

    # 2) Cuota por empresa (cada llamada a Gemini cuesta dinero).
    _check_scan_quota(empresa_id)

    started_at = datetime.now(timezone.utc).isoformat()
    log_res = supabase.table("scan_logs").insert({
        "scan_started_at": started_at,
        "scan_status": "processing",
        "empresa_id": empresa_id,
    }).execute()
    if not log_res.data:
        raise HTTPException(status_code=500, detail="No se pudo iniciar el registro de escaneo")
    scan_log_id = log_res.data[0]["id"]

    try:
        text = call_gemini(img)
    except Exception as e:
        logger.warning("Fallo de Gemini en scan_log %s: %s", scan_log_id, e)
        supabase.table("scan_logs").update({
            "scan_completed_at": datetime.now(timezone.utc).isoformat(),
            "scan_status": "failed_other",
        }).eq("id", scan_log_id).execute()
        raise HTTPException(
            status_code=502,
            detail="El servicio de escaneo no está disponible en este momento. Intenta de nuevo.",
        )

    try:
        result = parse_scan_result(text)
    except Exception:
        supabase.table("scan_logs").update({
            "scan_completed_at": datetime.now(timezone.utc).isoformat(),
            "scan_status": "failed_illegible",
        }).eq("id", scan_log_id).execute()
        raise HTTPException(status_code=422, detail="No se pudo interpretar la respuesta de Gemini")

    supabase.table("scan_logs").update({
        "scan_completed_at": datetime.now(timezone.utc).isoformat(),
        "scan_status": "success",
        "campos_extraidos": result.model_dump(),
    }).eq("id", scan_log_id).execute()

    return {**result.model_dump(), "scan_log_id": scan_log_id}
