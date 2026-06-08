from pydantic import BaseModel, Field


class BcvRateUpsert(BaseModel):
    fecha: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    promedio: float = Field(gt=0, le=1e9)


class BcvRate(BaseModel):
    fecha: str
    promedio: float
    fetched_at: str | None = None
