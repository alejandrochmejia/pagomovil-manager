from pydantic import BaseModel


class CuentaCreate(BaseModel):
    nombre: str
    banco: str
    telefono: str
    cedula: str
    activa: bool = True


class CuentaUpdate(BaseModel):
    nombre: str | None = None
    banco: str | None = None
    telefono: str | None = None
    cedula: str | None = None
    activa: bool | None = None
