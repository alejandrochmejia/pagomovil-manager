from fastapi import APIRouter, HTTPException

from config import supabase
from schemas.cuenta import CuentaCreate, CuentaUpdate

router = APIRouter(prefix="/cuentas", tags=["cuentas"])


@router.get("")
async def list_cuentas():
    return supabase.table("cuentas_receptoras").select("*").order("id", desc=True).execute().data


@router.post("", status_code=201)
async def create_cuenta(cuenta: CuentaCreate):
    data = cuenta.model_dump(exclude_none=True)
    return supabase.table("cuentas_receptoras").insert(data).execute().data[0]


@router.put("/{cuenta_id}")
async def update_cuenta(cuenta_id: int, cuenta: CuentaUpdate):
    data = cuenta.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = supabase.table("cuentas_receptoras").update(data).eq("id", cuenta_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return res.data[0]


@router.delete("/{cuenta_id}", status_code=204)
async def delete_cuenta(cuenta_id: int):
    supabase.table("cuentas_receptoras").delete().eq("id", cuenta_id).execute()
