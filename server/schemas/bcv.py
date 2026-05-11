from pydantic import BaseModel


class BcvRateUpsert(BaseModel):
    fecha: str  # YYYY-MM-DD
    promedio: float


class BcvRate(BaseModel):
    fecha: str
    promedio: float
    fetched_at: str | None = None
