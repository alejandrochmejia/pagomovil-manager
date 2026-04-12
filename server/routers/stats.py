from fastapi import APIRouter, Query

from config import supabase
from schemas.stats import StatsSummary, ScanStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
async def get_summary():
    res = supabase.rpc("get_stats_summary").execute()
    return StatsSummary(**res.data)


@router.get("/breakdown")
async def get_breakdown(
    desde: str = Query(...),
    hasta: str = Query(...),
    group_by: str = Query(..., alias="group_by"),
):
    res = supabase.rpc("get_stats_breakdown", {
        "p_desde": desde,
        "p_hasta": hasta,
        "p_group_by": group_by,
    }).execute()
    return res.data


@router.get("/scans", response_model=ScanStats)
async def get_scan_stats():
    res = supabase.rpc("get_scan_stats").execute()
    return ScanStats(**res.data)
