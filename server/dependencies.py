from fastapi import Depends, HTTPException, Request

from config import supabase


def get_current_user(request: Request) -> dict:
    """Extrae y valida el JWT del header Authorization."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")

    token = auth.removeprefix("Bearer ")
    try:
        res = supabase.auth.get_user(token)
        return {
            "id": res.user.id,
            "email": res.user.email,
            "nombre": res.user.user_metadata.get("nombre", ""),
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")


def get_empresa_id(request: Request, user: dict = Depends(get_current_user)) -> int:
    """Extrae empresa_id del header X-Empresa-Id y valida pertenencia."""
    raw = request.headers.get("X-Empresa-Id")
    if not raw:
        raise HTTPException(status_code=400, detail="X-Empresa-Id header requerido")

    try:
        empresa_id = int(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-Empresa-Id invalido")

    # Verificar que el usuario pertenece a la empresa
    res = (
        supabase.table("empresa_miembros")
        .select("id")
        .eq("empresa_id", empresa_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="No perteneces a esta empresa")

    return empresa_id
