import json
import logging
from io import BytesIO

from PIL import Image

from config import gemini, SCAN_MODEL
from schemas.scan import ScanResponse

logger = logging.getLogger(__name__)

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


def decode_image(base64_str: str) -> Image.Image:
    """Decodifica base64 a PIL Image."""
    import base64

    image_bytes = base64.b64decode(base64_str)
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def call_gemini(img: Image.Image) -> str:
    """Envia imagen a Gemini y devuelve el texto crudo."""
    logger.info("Enviando imagen a Gemini (%s)...", SCAN_MODEL)
    response = gemini.models.generate_content(model=SCAN_MODEL, contents=[PROMPT, img])
    logger.info("Respuesta recibida de Gemini")
    return response.text.strip()


def clean_json_response(text: str) -> str:
    """Elimina bloques de codigo markdown si existen."""
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


def normalize_montos(data: dict) -> tuple[float | None, float, float | None]:
    """Asegura consistencia entre monto, comision y montoTotal."""
    monto = data.get("monto")
    comision = data.get("comision") or 0
    monto_total = data.get("montoTotal")

    if monto_total and not monto:
        monto = monto_total - comision
    elif monto and not monto_total:
        monto_total = monto + comision

    return monto, comision, monto_total


def parse_scan_result(text: str) -> ScanResponse:
    """Parsea la respuesta de Gemini a ScanResponse."""
    text = clean_json_response(text)
    data = json.loads(text)

    monto, comision, monto_total = normalize_montos(data)

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
