from fastapi import APIRouter, Depends, Query

from config import supabase
from rbac import get_user_with_role
from schemas.stats import StatsSummary, ScanStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
async def get_summary(ctx: dict = Depends(get_user_with_role)):
    res = supabase.rpc("get_stats_summary", {"p_empresa_id": ctx["empresa_id"]}).execute()
    return StatsSummary(**res.data)


@router.get("/breakdown")
async def get_breakdown(
    desde: str = Query(...),
    hasta: str = Query(...),
    group_by: str = Query(..., alias="group_by"),
    ctx: dict = Depends(get_user_with_role),
):
    res = supabase.rpc("get_stats_breakdown", {
        "p_desde": desde,
        "p_hasta": hasta,
        "p_group_by": group_by,
        "p_empresa_id": ctx["empresa_id"],
    }).execute()
    return res.data


@router.get("/scans", response_model=ScanStats)
async def get_scan_stats(ctx: dict = Depends(get_user_with_role)):
    res = supabase.rpc("get_scan_stats", {"p_empresa_id": ctx["empresa_id"]}).execute()
    return ScanStats(**res.data)
