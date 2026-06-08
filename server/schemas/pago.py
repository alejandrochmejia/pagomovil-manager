from typing import Literal

from pydantic import BaseModel, Field

# Estados válidos (deben coincidir con _ESTADOS_VALIDOS en routers/pagos.py).
Estado = Literal["confirmado", "pendiente", "rechazado", "anulado"]

# NOTA: el monto se modela como float por compatibilidad con el resto del código
# y la columna numeric de la DB. Para dinero, lo ideal a futuro es Decimal; aquí
# al menos se acota a positivo y a un máximo razonable.
_MONTO_MAX = 1e12


class PagoCreate(BaseModel):
    monto: float = Field(gt=0, le=_MONTO_MAX)
    banco: str = Field(min_length=1, max_length=80)
    cedula: str = Field(min_length=3, max_length=20)
    telefono: str | None = Field(default=None, max_length=20)
    fecha: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    hora: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    referencia: str = Field(min_length=1, max_length=40)
    concepto: str | None = Field(default=None, max_length=255)
    cuenta_receptora_id: int | None = Field(default=None, ge=1)
    imagen_uri: str | None = None
    estado: Estado = "confirmado"
    origen: str = Field(default="manual", max_length=20)
    campos_corregidos: list[str] | None = None
    scan_log_id: int | None = Field(default=None, ge=1)


class PagoUpdate(BaseModel):
    monto: float | None = Field(default=None, gt=0, le=_MONTO_MAX)
    banco: str | None = Field(default=None, min_length=1, max_length=80)
    cedula: str | None = Field(default=None, min_length=3, max_length=20)
    telefono: str | None = Field(default=None, max_length=20)
    fecha: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    hora: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    referencia: str | None = Field(default=None, min_length=1, max_length=40)
    concepto: str | None = Field(default=None, max_length=255)
    cuenta_receptora_id: int | None = Field(default=None, ge=1)
    estado: Estado | None = None
    imagen_uri: str | None = None
    scan_log_id: int | None = Field(default=None, ge=1)
    campos_corregidos: list[str] | None = None
