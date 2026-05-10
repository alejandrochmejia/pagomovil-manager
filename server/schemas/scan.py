from pydantic import BaseModel


class ScanRequest(BaseModel):
    image: str  # base64


class ScanResponse(BaseModel):
    monto: float | None = None
    comision: float | None = None
    montoTotal: float | None = None
    banco: str | None = None
    cedula: str | None = None
    telefono: str | None = None
    fecha: str | None = None
    hora: str | None = None
    referencia: str | None = None
    concepto: str | None = None
    banco_destino: str | None = None
    cedula_destino: str | None = None
    telefono_destino: str | None = None
