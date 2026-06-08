from pydantic import BaseModel, Field


class CuentaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    banco: str = Field(min_length=1, max_length=80)
    telefono: str = Field(min_length=1, max_length=20)
    cedula: str = Field(min_length=3, max_length=20)
    activa: bool = True


class CuentaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=80)
    banco: str | None = Field(default=None, min_length=1, max_length=80)
    telefono: str | None = Field(default=None, min_length=1, max_length=20)
    cedula: str | None = Field(default=None, min_length=3, max_length=20)
    activa: bool | None = None
