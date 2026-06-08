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
  "monto": number,           // monto enviado SIN comisión (lo que recibe el beneficiario)
  "comision": number,        // comisión cobrada por el banco (0 si no se ve)
  "montoTotal": number,      // monto total debitado (monto + comisión)
  "banco": string,           // banco emisor del comprobante (banco del pagador)
  "cedula": string,          // cédula del pagador, formato "V-12345678"
  "telefono": string,        // teléfono del pagador, formato "0412-1234567"
  "fecha": string,           // fecha del pago en formato "YYYY-MM-DD"
  "hora": string,            // hora del pago en formato "HH:MM"
  "referencia": string,      // número de referencia/confirmación (solo dígitos)
  "concepto": string,        // concepto o descripción del pago
  "banco_destino": string,   // banco que recibe el pago (banco del beneficiario)
  "cedula_destino": string,  // cédula del beneficiario, formato "V-12345678" o "J-12345678"
  "telefono_destino": string // teléfono del beneficiario, formato "0412-1234567"
}

Reglas importantes:
- Si el comprobante muestra un monto total y una comisión, calcula: monto = montoTotal - comisión
- Si solo muestra un monto sin desglose de comisión, ese es el "monto" y comisión = 0
- La referencia debe contener SOLO dígitos, sin letras ni caracteres especiales
- Las cédulas deben incluir el prefijo (V-, J-, E-, G-)
- Distingue claramente entre los datos del PAGADOR (cedula/telefono/banco) y los datos del BENEFICIARIO (cedula_destino/telefono_destino/banco_destino)
- Si no puedes identificar un campo, usa null
- Devuelve SOLO el JSON, sin texto adicional ni bloques de código"""


class ImageTooLarge(Exception):
    """La imagen decodificada supera el limite de bytes permitido."""


def decode_image(base64_str: str, max_bytes: int | None = None) -> Image.Image:
    """Decodifica base64 a PIL Image, opcionalmente acotando el tamano."""
    import base64

    image_bytes = base64.b64decode(base64_str)
    if max_bytes is not None and len(image_bytes) > max_bytes:
        raise ImageTooLarge(len(image_bytes))
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
        banco_destino=data.get("banco_destino"),
        cedula_destino=data.get("cedula_destino"),
        telefono_destino=data.get("telefono_destino"),
    )
