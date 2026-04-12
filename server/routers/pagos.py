import json

from fastapi import APIRouter, HTTPException, Query

from config import supabase
from schemas.pago import PagoCreate, PagoUpdate

router = APIRouter(prefix="/pagos", tags=["pagos"])


def _audit(tabla: str, registro_id: int, accion: str, cambios: dict | None = None):
    supabase.table("audit_log").insert({
        "tabla": tabla,
        "registro_id": registro_id,
        "accion": accion,
        "cambios": json.loads(json.dumps(cambios)) if cambios else None,
    }).execute()


@router.get("")
async def list_pagos(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
):
    q = supabase.table("pagos").select("*").order("fecha", desc=True).order("id", desc=True)
    if desde:
        q = q.gte("fecha", desde)
    if hasta:
        q = q.lte("fecha", hasta)
    return q.execute().data


@router.post("", status_code=201)
async def create_pago(pago: PagoCreate):
    scan_log_id = pago.scan_log_id
    data = pago.model_dump(exclude_none=True)
    data.pop("scan_log_id", None)
    res = supabase.table("pagos").insert(data).execute()
    created = res.data[0]

    _audit("pagos", created["id"], "crear")

    # Enlazar scan_log al pago creado
    if scan_log_id:
        supabase.table("scan_logs").update({"pago_id": created["id"]}).eq("id", scan_log_id).execute()

    return created


@router.put("/{pago_id}")
async def update_pago(pago_id: int, pago: PagoUpdate):
    data = pago.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = supabase.table("pagos").update(data).eq("id", pago_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    _audit("pagos", pago_id, "editar", data)
    return res.data[0]


@router.delete("/{pago_id}", status_code=204)
async def delete_pago(pago_id: int):
    _audit("pagos", pago_id, "eliminar")
    supabase.table("pagos").delete().eq("id", pago_id).execute()
