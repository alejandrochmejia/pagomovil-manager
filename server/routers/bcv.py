from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from config import supabase
from dependencies import get_current_user
from schemas.bcv import BcvRateUpsert

router = APIRouter(prefix="/bcv-rates", tags=["bcv"])


@router.get("")
async def list_bcv_rates(
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    hasta: str | None = Query(None, description="YYYY-MM-DD"),
    _user: dict = Depends(get_current_user),
):
    query = supabase.table("bcv_rates").select("*").order("fecha", desc=False)
    if desde:
        query = query.gte("fecha", desde)
    if hasta:
        query = query.lte("fecha", hasta)
    return query.execute().data or []


@router.post("", status_code=200)
async def upsert_bcv_rate(
    payload: BcvRateUpsert,
    _user: dict = Depends(get_current_user),
):
    if payload.promedio <= 0:
        raise HTTPException(status_code=400, detail="Promedio invalido")

    record = {
        "fecha": payload.fecha,
        "promedio": payload.promedio,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    res = (
        supabase.table("bcv_rates")
        .upsert(record, on_conflict="fecha")
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=500, detail="No se pudo guardar la tasa")
    return res.data[0]
