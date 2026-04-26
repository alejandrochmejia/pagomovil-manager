from fastapi import APIRouter, Depends, HTTPException, Query

from config import supabase
from rbac import require_permission

router = APIRouter(prefix="/scan-logs", tags=["scan-logs"])

LIST_COLUMNS = (
    "id,pago_id,scan_started_at,scan_completed_at,scan_status,"
    "campos_extraidos,campos_finales,creado_en"
)


@router.get("")
async def list_scan_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    scan_status: str | None = Query(None),
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    ctx: dict = Depends(require_permission("audit_log")),
):
    empresa_id = ctx["empresa_id"]
    start = (page - 1) * page_size
    end = start + page_size - 1

    query = (
        supabase.table("scan_logs")
        .select(LIST_COLUMNS, count="exact")
        .eq("empresa_id", empresa_id)
        .order("creado_en", desc=True)
    )
    if scan_status:
        query = query.eq("scan_status", scan_status)
    if desde:
        query = query.gte("creado_en", desde)
    if hasta:
        query = query.lte("creado_en", f"{hasta}T23:59:59.999Z")

    res = query.range(start, end).execute()
    items = res.data or []
    total = res.count or 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (start + len(items)) < total,
    }


@router.get("/{scan_log_id}")
async def get_scan_log(
    scan_log_id: int,
    ctx: dict = Depends(require_permission("audit_log")),
):
    """Detalle individual incluyendo imagen_uri (separado del listado para no inflar el payload)."""
    res = (
        supabase.table("scan_logs")
        .select("*")
        .eq("id", scan_log_id)
        .eq("empresa_id", ctx["empresa_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Scan log no encontrado")
    return res.data[0]
