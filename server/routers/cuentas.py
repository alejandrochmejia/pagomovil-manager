import re

from fastapi import APIRouter, Depends, HTTPException, Query

from config import supabase
from rbac import require_permission, get_user_with_role
from schemas.cuenta import CuentaCreate, CuentaUpdate

router = APIRouter(prefix="/cuentas", tags=["cuentas"])


def _sanitize_search(q: str) -> str:
    return re.sub(r"[,()*\\]", "", q).strip()[:100]


def _build_query(empresa_id: int, q: str | None, count: bool):
    table = supabase.table("cuentas_receptoras")
    query = table.select("*", count="exact") if count else table.select("*")
    query = query.eq("empresa_id", empresa_id).order("id", desc=True)
    if q:
        term = _sanitize_search(q)
        if term:
            filters = [
                f"nombre.ilike.*{term}*",
                f"banco.ilike.*{term}*",
                f"telefono.ilike.*{term}*",
                f"cedula.ilike.*{term}*",
            ]
            query = query.or_(",".join(filters))
    return query


@router.get("")
async def list_cuentas(
    page: int | None = Query(None, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    q: str | None = Query(None),
    ctx: dict = Depends(get_user_with_role),
):
    empresa_id = ctx["empresa_id"]

    if page is None:
        # Modo no-paginado: devuelve array completo (lo usan los dropdowns).
        return _build_query(empresa_id, q, count=False).execute().data

    start = (page - 1) * page_size
    end = start + page_size - 1
    res = _build_query(empresa_id, q, count=True).range(start, end).execute()
    items = res.data or []
    total = res.count or 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (start + len(items)) < total,
    }


@router.post("", status_code=201)
async def create_cuenta(cuenta: CuentaCreate, ctx: dict = Depends(require_permission("cuentas_crud"))):
    data = cuenta.model_dump(exclude_none=True)
    data["empresa_id"] = ctx["empresa_id"]
    return supabase.table("cuentas_receptoras").insert(data).execute().data[0]


@router.put("/{cuenta_id}")
async def update_cuenta(cuenta_id: int, cuenta: CuentaUpdate, ctx: dict = Depends(require_permission("cuentas_crud"))):
    data = cuenta.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = (
        supabase.table("cuentas_receptoras")
        .update(data)
        .eq("id", cuenta_id)
        .eq("empresa_id", ctx["empresa_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return res.data[0]


@router.delete("/{cuenta_id}", status_code=204)
async def delete_cuenta(cuenta_id: int, ctx: dict = Depends(require_permission("cuentas_crud"))):
    supabase.table("cuentas_receptoras").delete().eq("id", cuenta_id).eq("empresa_id", ctx["empresa_id"]).execute()
