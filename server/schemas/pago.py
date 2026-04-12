from pydantic import BaseModel


class PagoCreate(BaseModel):
    monto: float
    banco: str
    cedula: str
    telefono: str | None = None
    fecha: str
    hora: str | None = None
    referencia: str
    concepto: str | None = None
    cuenta_receptora_id: int | None = None
    imagen_uri: str | None = None


class PagoUpdate(BaseModel):
    monto: float | None = None
    banco: str | None = None
    cedula: str | None = None
    telefono: str | None = None
    fecha: str | None = None
    hora: str | None = None
    referencia: str | None = None
    concepto: str | None = None
