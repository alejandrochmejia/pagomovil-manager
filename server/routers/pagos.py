import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from config import supabase
from rbac import require_permission, get_user_with_role
from schemas.pago import PagoCreate, PagoUpdate

router = APIRouter(prefix="/pagos", tags=["pagos"])


def _audit(tabla: str, registro_id: int, accion: str, empresa_id: int, cambios: dict | None = None):
    supabase.table("audit_log").insert({
        "tabla": tabla,
        "registro_id": registro_id,
        "accion": accion,
        "empresa_id": empresa_id,
        "cambios": json.loads(json.dumps(cambios)) if cambios else None,
    }).execute()


@router.get("")
async def list_pagos(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    ctx: dict = Depends(get_user_with_role),
):
    rol = ctx["rol"]
    empresa_id = ctx["empresa_id"]
    today = date.today().isoformat()

    if rol == "cajero":
        desde = today
        hasta = today
    elif rol == "supervisor":
        min_date = (date.today() - timedelta(days=7)).isoformat()
        if not desde or desde < min_date:
            desde = min_date
        if not hasta or hasta > today:
            hasta = today

    q = (
        supabase.table("pagos")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("fecha", desc=True)
        .order("id", desc=True)
    )
    if desde:
        q = q.gte("fecha", desde)
    if hasta:
        q = q.lte("fecha", hasta)
    return q.execute().data


@router.post("", status_code=201)
async def create_pago(pago: PagoCreate, ctx: dict = Depends(require_permission("pagos_crear"))):
    empresa_id = ctx["empresa_id"]
    scan_log_id = pago.scan_log_id
    data = pago.model_dump(exclude_none=True)
    data.pop("scan_log_id", None)
    data["empresa_id"] = empresa_id
    res = supabase.table("pagos").insert(data).execute()
    created = res.data[0]
    _audit("pagos", created["id"], "crear", empresa_id)
    if scan_log_id:
        supabase.table("scan_logs").update({"pago_id": created["id"]}).eq("id", scan_log_id).execute()
    return created


@router.put("/{pago_id}")
async def update_pago(pago_id: int, pago: PagoUpdate, ctx: dict = Depends(require_permission("pagos_editar"))):
    empresa_id = ctx["empresa_id"]
    data = pago.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = supabase.table("pagos").update(data).eq("id", pago_id).eq("empresa_id", empresa_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    _audit("pagos", pago_id, "editar", empresa_id, data)
    return res.data[0]


@router.delete("/{pago_id}", status_code=204)
async def delete_pago(pago_id: int, ctx: dict = Depends(require_permission("pagos_eliminar"))):
    empresa_id = ctx["empresa_id"]
    _audit("pagos", pago_id, "eliminar", empresa_id)
    supabase.table("pagos").delete().eq("id", pago_id).eq("empresa_id", empresa_id).execute()
