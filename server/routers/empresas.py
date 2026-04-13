from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import supabase
from dependencies import get_current_user
from rbac import can_change_role, MANAGEABLE_ROLES, ROLES

router = APIRouter(prefix="/empresas", tags=["empresas"])

MAX_EMPRESAS = 3
INVITABLE_ROLES = {"admin", "supervisor", "cajero", "contador"}


class EmpresaCreate(BaseModel):
    nombre: str


class EmpresaUpdate(BaseModel):
    nombre: str


class InviteRequest(BaseModel):
    email: str
    rol: str = "cajero"


class RolUpdate(BaseModel):
    rol: str


@router.get("")
async def list_my_empresas(user: dict = Depends(get_current_user)):
    res = (
        supabase.table("empresa_miembros")
        .select("empresa_id, rol, empresas(id, nombre, creado_en)")
        .eq("user_id", user["id"])
        .execute()
    )
    return [
        {**m["empresas"], "rol": m["rol"]}
        for m in res.data
        if m.get("empresas")
    ]


@router.post("", status_code=201)
async def create_empresa(req: EmpresaCreate, user: dict = Depends(get_current_user)):
    count_res = (
        supabase.table("empresas")
        .select("id", count="exact")
        .eq("created_by", user["id"])
        .execute()
    )
    if count_res.count >= MAX_EMPRESAS:
        raise HTTPException(status_code=400, detail=f"Maximo {MAX_EMPRESAS} empresas permitidas")

    emp_res = supabase.table("empresas").insert({
        "nombre": req.nombre,
        "created_by": user["id"],
    }).execute()
    empresa = emp_res.data[0]

    # Creador siempre es dueno
    supabase.table("empresa_miembros").insert({
        "empresa_id": empresa["id"],
        "user_id": user["id"],
        "rol": "dueno",
    }).execute()

    return empresa


@router.put("/{empresa_id}")
async def update_empresa(empresa_id: int, req: EmpresaUpdate, user: dict = Depends(get_current_user)):
    _require_admin_or_dueno(empresa_id, user["id"])
    res = supabase.table("empresas").update({"nombre": req.nombre}).eq("id", empresa_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return res.data[0]


# --- Miembros ---

@router.get("/{empresa_id}/miembros")
async def list_miembros(empresa_id: int, user: dict = Depends(get_current_user)):
    _require_admin_or_dueno(empresa_id, user["id"])
    res = (
        supabase.table("empresa_miembros")
        .select("id, user_id, rol, creado_en")
        .eq("empresa_id", empresa_id)
        .execute()
    )
    miembros = []
    for m in res.data:
        try:
            u = supabase.auth.admin.get_user_by_id(m["user_id"])
            email = u.user.email
            nombre = u.user.user_metadata.get("nombre", "")
        except Exception:
            email = "desconocido"
            nombre = ""
        miembros.append({**m, "email": email, "nombre": nombre})
    return miembros


@router.put("/{empresa_id}/miembros/{miembro_id}/rol")
async def update_miembro_rol(empresa_id: int, miembro_id: int, req: RolUpdate, user: dict = Depends(get_current_user)):
    actor_rol = _get_rol(empresa_id, user["id"])

    if req.rol not in INVITABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Rol invalido. Opciones: {', '.join(INVITABLE_ROLES)}")

    # Obtener rol actual del target
    target_res = (
        supabase.table("empresa_miembros")
        .select("rol")
        .eq("id", miembro_id)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    if not target_res.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")

    target_rol = target_res.data[0]["rol"]

    if not can_change_role(actor_rol, target_rol, req.rol):
        if target_rol == "dueno":
            raise HTTPException(status_code=403, detail="No se puede cambiar el rol del dueno")
        raise HTTPException(status_code=403, detail="No tienes permiso para este cambio de rol")

    res = (
        supabase.table("empresa_miembros")
        .update({"rol": req.rol})
        .eq("id", miembro_id)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    return res.data[0]


@router.delete("/{empresa_id}/miembros/{miembro_id}", status_code=204)
async def remove_miembro(empresa_id: int, miembro_id: int, user: dict = Depends(get_current_user)):
    _require_admin_or_dueno(empresa_id, user["id"])

    # No permitir eliminar al dueno
    target_res = (
        supabase.table("empresa_miembros")
        .select("rol")
        .eq("id", miembro_id)
        .eq("empresa_id", empresa_id)
        .execute()
    )
    if target_res.data and target_res.data[0]["rol"] == "dueno":
        raise HTTPException(status_code=403, detail="No se puede eliminar al dueno")

    supabase.table("empresa_miembros").delete().eq("id", miembro_id).eq("empresa_id", empresa_id).execute()


# --- Invitaciones ---

@router.post("/{empresa_id}/invitar")
async def invite_member(empresa_id: int, req: InviteRequest, user: dict = Depends(get_current_user)):
    actor_rol = _get_rol(empresa_id, user["id"])
    if actor_rol not in ("dueno", "admin"):
        raise HTTPException(status_code=403, detail="Solo dueno y admin pueden invitar")

    if req.rol not in INVITABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Rol invalido. Opciones: {', '.join(INVITABLE_ROLES)}")

    manageable = MANAGEABLE_ROLES.get(actor_rol, set())
    if req.rol not in manageable:
        raise HTTPException(status_code=403, detail=f"No puedes invitar con rol {req.rol}")

    existing = (
        supabase.table("invitaciones")
        .select("id")
        .eq("empresa_id", empresa_id)
        .eq("email", req.email)
        .eq("estado", "pendiente")
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Ya hay una invitacion pendiente para este email")

    res = supabase.table("invitaciones").insert({
        "empresa_id": empresa_id,
        "email": req.email,
        "rol": req.rol,
        "invitado_por": user["id"],
    }).execute()
    return res.data[0]


@router.get("/{empresa_id}/invitaciones")
async def list_invitaciones(empresa_id: int, user: dict = Depends(get_current_user)):
    _require_admin_or_dueno(empresa_id, user["id"])
    res = (
        supabase.table("invitaciones")
        .select("*")
        .eq("empresa_id", empresa_id)
        .eq("estado", "pendiente")
        .order("creado_en", desc=True)
        .execute()
    )
    return res.data


@router.post("/aceptar-invitacion/{token}")
async def accept_invitation(token: str, user: dict = Depends(get_current_user)):
    res = (
        supabase.table("invitaciones")
        .select("*")
        .eq("token", token)
        .eq("estado", "pendiente")
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada o expirada")

    inv = res.data[0]
    if inv["email"] != user["email"]:
        raise HTTPException(status_code=403, detail="Esta invitacion no es para tu email")

    supabase.table("empresa_miembros").insert({
        "empresa_id": inv["empresa_id"],
        "user_id": user["id"],
        "rol": inv["rol"],
        "invitado_por": inv["invitado_por"],
    }).execute()

    supabase.table("invitaciones").update({"estado": "aceptada"}).eq("id", inv["id"]).execute()
    return {"message": "Invitacion aceptada", "empresa_id": inv["empresa_id"]}


@router.delete("/{empresa_id}/invitaciones/{inv_id}", status_code=204)
async def cancel_invitation(empresa_id: int, inv_id: int, user: dict = Depends(get_current_user)):
    _require_admin_or_dueno(empresa_id, user["id"])
    supabase.table("invitaciones").update({"estado": "cancelada"}).eq("id", inv_id).eq("empresa_id", empresa_id).execute()


# --- Helpers ---

def _get_rol(empresa_id: int, user_id: str) -> str:
    res = (
        supabase.table("empresa_miembros")
        .select("rol")
        .eq("empresa_id", empresa_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="No perteneces a esta empresa")
    return res.data[0]["rol"]


def _require_admin_or_dueno(empresa_id: int, user_id: str):
    rol = _get_rol(empresa_id, user_id)
    if rol not in ("dueno", "admin"):
        raise HTTPException(status_code=403, detail="Necesitas ser admin o dueno")
