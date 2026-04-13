from fastapi import Depends, HTTPException, Request
from dependencies import get_current_user
from config import supabase

ROLES = ("dueno", "admin", "supervisor", "cajero", "contador")

PERMISSIONS: dict[str, set[str]] = {
    "dashboard_full":       {"dueno", "admin", "contador"},
    "dashboard_kpi_basico": {"dueno", "admin", "supervisor"},
    "pagos_ver_all":        {"dueno", "admin", "contador"},
    "pagos_ver_7d":         {"supervisor"},
    "pagos_ver_hoy":        {"cajero"},
    "pagos_crear":          {"dueno", "admin", "supervisor", "cajero"},
    "pagos_editar":         {"dueno", "admin", "supervisor", "cajero"},
    "pagos_eliminar":       {"dueno", "admin"},
    "scan":                 {"dueno", "admin", "supervisor", "cajero"},
    "cuentas_ver":          {"dueno", "admin", "supervisor", "cajero", "contador"},
    "cuentas_crud":         {"dueno", "admin", "supervisor"},
    "exportar":             {"dueno", "admin", "contador"},
    "gestion_usuarios":     {"dueno", "admin"},
    "config_sistema":       {"dueno", "admin"},
    "audit_log":            {"dueno", "admin", "contador"},
    "autorizar_duplicados": {"dueno", "admin", "supervisor"},
}

# Roles que cada actor puede asignar
MANAGEABLE_ROLES: dict[str, set[str]] = {
    "dueno": {"admin", "supervisor", "cajero", "contador"},
    "admin": {"supervisor", "cajero", "contador"},
}


def can_change_role(actor_role: str, target_current_role: str, target_new_role: str) -> bool:
    if target_current_role == "dueno":
        return False
    if target_new_role == "dueno":
        return False
    manageable = MANAGEABLE_ROLES.get(actor_role, set())
    return target_current_role in (manageable | {target_current_role}) and target_new_role in manageable


def has_permission(role: str, permission: str) -> bool:
    return role in PERMISSIONS.get(permission, set())


def _get_role(empresa_id: int, user_id: str) -> str:
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


def require_permission(permission: str):
    """Factory que retorna un Depends() que valida el permiso."""
    def dependency(
        request: Request,
        user: dict = Depends(get_current_user),
    ) -> dict:
        raw = request.headers.get("X-Empresa-Id")
        if not raw:
            raise HTTPException(status_code=400, detail="X-Empresa-Id requerido")
        empresa_id = int(raw)
        rol = _get_role(empresa_id, user["id"])
        if not has_permission(rol, permission):
            raise HTTPException(status_code=403, detail="No tienes permiso para esta accion")
        return {**user, "empresa_id": empresa_id, "rol": rol}
    return dependency


def get_user_with_role(
    request: Request,
    user: dict = Depends(get_current_user),
) -> dict:
    """Retorna user + empresa_id + rol sin validar permiso especifico."""
    raw = request.headers.get("X-Empresa-Id")
    if not raw:
        raise HTTPException(status_code=400, detail="X-Empresa-Id requerido")
    empresa_id = int(raw)
    rol = _get_role(empresa_id, user["id"])
    return {**user, "empresa_id": empresa_id, "rol": rol}
