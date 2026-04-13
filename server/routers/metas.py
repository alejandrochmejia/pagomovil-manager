from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import supabase
from dependencies import get_current_user, get_empresa_id

router = APIRouter(prefix="/metas", tags=["metas"])


class MetaCreate(BaseModel):
    mes: str
    meta_ingresos: float


@router.get("")
async def list_metas(
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    return (
        supabase.table("metas_mensuales")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("mes", desc=True)
        .execute()
        .data
    )


@router.get("/{mes}")
async def get_meta(
    mes: str,
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    res = (
        supabase.table("metas_mensuales")
        .select("*")
        .eq("mes", mes)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return res.data[0]


@router.post("", status_code=201)
async def upsert_meta(
    meta: MetaCreate,
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    data = meta.model_dump()
    data["empresa_id"] = empresa_id
    # Upsert por mes + empresa_id
    existing = (
        supabase.table("metas_mensuales")
        .select("id")
        .eq("mes", meta.mes)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    if existing.data:
        res = (
            supabase.table("metas_mensuales")
            .update({"meta_ingresos": meta.meta_ingresos})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        res = supabase.table("metas_mensuales").insert(data).execute()
    return res.data[0]
