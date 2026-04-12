from fastapi import APIRouter, HTTPException

from schemas.scan import ScanRequest, ScanResponse
from services.gemini import decode_image, call_gemini, parse_scan_result

router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
async def scan_receipt(req: ScanRequest):
    try:
        img = decode_image(req.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen invalida")

    try:
        text = call_gemini(img)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error de Gemini: {e}")

    try:
        return parse_scan_result(text)
    except Exception:
        raise HTTPException(status_code=422, detail="No se pudo interpretar la respuesta de Gemini")
