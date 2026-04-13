from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import supabase
from rbac import require_permission, get_user_with_role

router = APIRouter(prefix="/metas", tags=["metas"])


class MetaCreate(BaseModel):
    mes: str
    meta_ingresos: float


@router.get("")
async def list_metas(ctx: dict = Depends(get_user_with_role)):
    return (
        supabase.table("metas_mensuales")
        .select("*")
        .eq("empresa_id", ctx["empresa_id"])
        .order("mes", desc=True)
        .execute()
        .data
    )


@router.post("", status_code=201)
async def upsert_meta(meta: MetaCreate, ctx: dict = Depends(require_permission("config_sistema"))):
    empresa_id = ctx["empresa_id"]
    data = meta.model_dump()
    data["empresa_id"] = empresa_id
    existing = (
        supabase.table("metas_mensuales")
        .select("id")
        .eq("mes", meta.mes)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    if existing.data:
        res = supabase.table("metas_mensuales").update({"meta_ingresos": meta.meta_ingresos}).eq("id", existing.data[0]["id"]).execute()
    else:
        res = supabase.table("metas_mensuales").insert(data).execute()
    return res.data[0]
