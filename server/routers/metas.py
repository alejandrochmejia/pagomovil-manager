from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import supabase

router = APIRouter(prefix="/metas", tags=["metas"])


class MetaCreate(BaseModel):
    mes: str
    meta_ingresos: float


@router.get("")
async def list_metas():
    return supabase.table("metas_mensuales").select("*").order("mes", desc=True).execute().data


@router.get("/{mes}")
async def get_meta(mes: str):
    res = supabase.table("metas_mensuales").select("*").eq("mes", mes).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return res.data[0]


@router.post("", status_code=201)
async def upsert_meta(meta: MetaCreate):
    data = meta.model_dump()
    res = supabase.table("metas_mensuales").upsert(data, on_conflict="mes").execute()
    return res.data[0]
