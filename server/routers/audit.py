from fastapi import APIRouter, Depends, Query

from config import supabase
from rbac import require_permission

router = APIRouter(prefix="/audit-log", tags=["audit"])


@router.get("")
async def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    tabla: str | None = Query(None),
    accion: str | None = Query(None),
    registro_id: int | None = Query(None),
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    ctx: dict = Depends(require_permission("audit_log")),
):
    empresa_id = ctx["empresa_id"]
    start = (page - 1) * page_size
    end = start + page_size - 1

    query = (
        supabase.table("audit_log")
        .select("*", count="exact")
        .eq("empresa_id", empresa_id)
        .order("creado_en", desc=True)
    )
    if tabla:
        query = query.eq("tabla", tabla)
    if accion:
        query = query.eq("accion", accion)
    if registro_id is not None:
        query = query.eq("registro_id", registro_id)
    if desde:
        query = query.gte("creado_en", desde)
    if hasta:
        # Incluir todo el día final
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


@router.get("/facets")
async def audit_log_facets(ctx: dict = Depends(require_permission("audit_log"))):
    """Devuelve valores distintos de 'tabla' y 'accion' para poblar filtros en la UI."""
    empresa_id = ctx["empresa_id"]
    # Limitamos a una ventana razonable para no escanear toda la historia
    res = (
        supabase.table("audit_log")
        .select("tabla,accion")
        .eq("empresa_id", empresa_id)
        .order("creado_en", desc=True)
        .limit(1000)
        .execute()
    )
    tablas: set[str] = set()
    acciones: set[str] = set()
    for row in res.data or []:
        if row.get("tabla"):
            tablas.add(row["tabla"])
        if row.get("accion"):
            acciones.add(row["accion"])
    return {
        "tablas": sorted(tablas),
        "acciones": sorted(acciones),
    }
