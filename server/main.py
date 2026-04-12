import base64
import json
import logging
import os
from io import BytesIO

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from PIL import Image
from pydantic import BaseModel

load_dotenv()
logger = logging.getLogger("scanner")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY no configurada en .env")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = os.getenv("SCAN_MODEL", "gemini-2.5-flash")

app = FastAPI(title="Pago Móvil Scanner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PROMPT = """Analiza esta imagen de un comprobante de pago móvil venezolano.
Extrae TODOS los datos que puedas identificar y devuélvelos en formato JSON con estos campos:

{
  "monto": number,         // monto enviado SIN comisión (lo que recibe el beneficiario)
  "comision": number,      // comisión cobrada por el banco (0 si no se ve)
  "montoTotal": number,    // monto total debitado (monto + comisión)
  "banco": string,         // nombre del banco que emite el comprobante
  "cedula": string,        // cédula del pagador o beneficiario, formato "V-12345678"
  "telefono": string,      // teléfono asociado al pago, formato "0412-1234567"
  "fecha": string,         // fecha del pago en formato "YYYY-MM-DD"
  "hora": string,          // hora del pago en formato "HH:MM"
  "referencia": string,    // número de referencia/confirmación (solo dígitos)
  "concepto": string       // concepto o descripción del pago
}

Reglas importantes:
- Si el comprobante muestra un monto total y una comisión, calcula: monto = montoTotal - comisión
- Si solo muestra un monto sin desglose de comisión, ese es el "monto" y comisión = 0
- La referencia debe contener SOLO dígitos, sin letras ni caracteres especiales
- La cédula debe incluir el prefijo (V-, J-, E-, G-)
- Si no puedes identificar un campo, usa null
- Devuelve SOLO el JSON, sin texto adicional ni bloques de código"""


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


@app.post("/scan", response_model=ScanResponse)
async def scan_receipt(req: ScanRequest):
    try:
        image_bytes = base64.b64decode(req.image)
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen inválida")

    try:
        logger.info(f"Enviando imagen a Gemini ({MODEL})...")
        response = client.models.generate_content(
            model=MODEL,
            contents=[PROMPT, img],
        )
        text = response.text.strip()
        logger.info("Respuesta recibida de Gemini")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error de Gemini: {e}")

    # Limpiar si viene envuelto en ```json ... ```
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
        text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="No se pudo interpretar la respuesta de Gemini",
        )

    # Asegurar consistencia de montos
    monto = data.get("monto")
    comision = data.get("comision") or 0
    monto_total = data.get("montoTotal")

    if monto_total and not monto:
        monto = monto_total - comision
    elif monto and not monto_total:
        monto_total = monto + comision

    return ScanResponse(
        monto=monto,
        comision=comision,
        montoTotal=monto_total,
        banco=data.get("banco"),
        cedula=data.get("cedula"),
        telefono=data.get("telefono"),
        fecha=data.get("fecha"),
        hora=data.get("hora"),
        referencia=str(data["referencia"]) if data.get("referencia") else None,
        concepto=data.get("concepto"),
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
