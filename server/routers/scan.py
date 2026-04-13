from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from config import supabase
from rbac import require_permission
from schemas.scan import ScanRequest
from services.gemini import decode_image, call_gemini, parse_scan_result

router = APIRouter()


@router.post("/scan")
async def scan_receipt(req: ScanRequest, ctx: dict = Depends(require_permission("scan"))):
    empresa_id = ctx["empresa_id"]

    try:
        img = decode_image(req.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen invalida")

    started_at = datetime.now(timezone.utc).isoformat()
    log_res = supabase.table("scan_logs").insert({
        "scan_started_at": started_at,
        "scan_status": "processing",
        "empresa_id": empresa_id,
    }).execute()
    scan_log_id = log_res.data[0]["id"]

    try:
        text = call_gemini(img)
    except Exception as e:
        supabase.table("scan_logs").update({
            "scan_completed_at": datetime.now(timezone.utc).isoformat(),
            "scan_status": "failed_other",
        }).eq("id", scan_log_id).execute()
        raise HTTPException(status_code=502, detail=f"Error de Gemini: {e}")

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
