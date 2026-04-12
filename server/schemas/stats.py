from pydantic import BaseModel


class StatsSummary(BaseModel):
    total_hoy: float = 0
    cantidad_hoy: int = 0
    total_ayer: float = 0
    cantidad_ayer: int = 0
    total_semana: float = 0
    cantidad_semana: int = 0
    total_semana_anterior: float = 0
    cantidad_semana_anterior: int = 0
    total_mes: float = 0
    cantidad_mes: int = 0
    promedio_ticket: float = 0
    duplicados_hoy: int = 0
    transacciones_editadas: int = 0
    transacciones_anuladas: int = 0
    pendientes_revision: int = 0
    meta_mes: float | None = None


class StatsBreakdown(BaseModel):
    grupo: str
    total: float
    cantidad: int


class ScanStats(BaseModel):
    tasa_rechazo: float = 0
    tiempo_promedio_ms: float = 0
    tasa_correccion: float = 0
    total_scans: int = 0
