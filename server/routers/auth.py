from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    nombre: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str


class UpdatePasswordRequest(BaseModel):
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    try:
        res = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"nombre": req.nombre}},
        })
        if res.user is None:
            raise HTTPException(status_code=400, detail="No se pudo crear el usuario")

        return {
            "user": {"id": res.user.id, "email": res.user.email},
            "session": {
                "access_token": res.session.access_token if res.session else None,
                "refresh_token": res.session.refresh_token if res.session else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        return {
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "nombre": res.user.user_metadata.get("nombre", ""),
            },
            "session": {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    try:
        res = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token invalido")


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    try:
        supabase.auth.reset_password_email(
            req.email,
            options={"redirect_to": "http://localhost:5173/#/reset-password"},
        )
        return {"message": "Email de recuperacion enviado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Obtener empresas del usuario
    empresas_res = (
        supabase.table("empresa_miembros")
        .select("empresa_id, rol, empresas(id, nombre)")
        .eq("user_id", user["id"])
        .execute()
    )

    empresas = []
    for m in empresas_res.data:
        emp = m.get("empresas")
        if emp:
            empresas.append({
                "id": emp["id"],
                "nombre": emp["nombre"],
                "rol": m["rol"],
            })

    return {
        "user": user,
        "empresas": empresas,
    }
