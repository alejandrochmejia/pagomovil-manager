from fastapi import APIRouter, HTTPException, Query

from config import supabase
from schemas.pago import PagoCreate, PagoUpdate

router = APIRouter(prefix="/pagos", tags=["pagos"])


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
    data = pago.model_dump(exclude_none=True)
    return supabase.table("pagos").insert(data).execute().data[0]


@router.put("/{pago_id}")
async def update_pago(pago_id: int, pago: PagoUpdate):
    data = pago.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = supabase.table("pagos").update(data).eq("id", pago_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return res.data[0]


@router.delete("/{pago_id}", status_code=204)
async def delete_pago(pago_id: int):
    supabase.table("pagos").delete().eq("id", pago_id).execute()
