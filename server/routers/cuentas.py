from fastapi import APIRouter, Depends, HTTPException

from config import supabase
from rbac import require_permission, get_user_with_role
from schemas.cuenta import CuentaCreate, CuentaUpdate

router = APIRouter(prefix="/cuentas", tags=["cuentas"])


@router.get("")
async def list_cuentas(ctx: dict = Depends(get_user_with_role)):
    return (
        supabase.table("cuentas_receptoras")
        .select("*")
        .eq("empresa_id", ctx["empresa_id"])
        .order("id", desc=True)
        .execute()
        .data
    )


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
