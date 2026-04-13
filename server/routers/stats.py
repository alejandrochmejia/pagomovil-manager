from fastapi import APIRouter, Depends, Query

from config import supabase
from dependencies import get_current_user, get_empresa_id
from schemas.stats import StatsSummary, ScanStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
async def get_summary(
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    res = supabase.rpc("get_stats_summary", {"p_empresa_id": empresa_id}).execute()
    return StatsSummary(**res.data)


@router.get("/breakdown")
async def get_breakdown(
    desde: str = Query(...),
    hasta: str = Query(...),
    group_by: str = Query(..., alias="group_by"),
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    res = supabase.rpc("get_stats_breakdown", {
        "p_desde": desde,
        "p_hasta": hasta,
        "p_group_by": group_by,
        "p_empresa_id": empresa_id,
    }).execute()
    return res.data


@router.get("/scans", response_model=ScanStats)
async def get_scan_stats(
    _user: dict = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
):
    res = supabase.rpc("get_scan_stats", {"p_empresa_id": empresa_id}).execute()
    return ScanStats(**res.data)
