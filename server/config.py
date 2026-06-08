import base64
import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

load_dotenv()


def _jwt_role(token: str) -> str | None:
    """Lee el claim 'role' de un JWT sin verificar la firma (solo inspeccion)."""
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("role")
    except Exception:
        return None


# --- Supabase ---
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# Fail-fast: el backend opera con permisos completos (bypassa RLS) y todo el
# aislamiento entre empresas se hace a nivel de aplicacion. Si por error se
# configura la anon/authenticated key, con RLS activo TODAS las consultas
# devolverian vacio de forma silenciosa. Es preferible no arrancar.
_role = _jwt_role(SUPABASE_KEY)
if _role != "service_role":
    raise RuntimeError(
        "SUPABASE_KEY debe ser la service_role key del proyecto "
        "(Dashboard -> Project Settings -> API -> service_role). "
        f"La key configurada tiene role='{_role or 'desconocido'}'. "
        "Con RLS activo, una key anon/authenticated hace que todas las "
        "consultas del backend devuelvan vacio."
    )

# Cliente de DATOS: .table()/.storage()/.rpc(). Opera siempre con service_role y
# su estado de auth NUNCA se muta durante una request.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cliente de AUTH: todas las operaciones de GoTrue (login, registro, refresh,
# reset, validacion de token, admin). Aislarlo del cliente de datos evita una
# race condition: antes, validar un token o hacer login mutaba las credenciales
# de PostgREST del cliente global y una request concurrente podia ejecutar una
# query con el token equivocado.
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Gemini ---
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "45000"))
gemini = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
)
SCAN_MODEL = os.getenv("SCAN_MODEL", "gemini-2.5-flash")

# --- Limites y tuning (configurable por env) ---
# Cuota de escaneo por empresa. Cada scan cuesta una llamada (de pago) a Gemini.
SCAN_RATE_PER_MIN = int(os.getenv("SCAN_RATE_PER_MIN", "20"))
SCAN_RATE_PER_DAY = int(os.getenv("SCAN_RATE_PER_DAY", "300"))
# Tamano maximo de la imagen decodificada (/scan y subida de comprobante).
MAX_IMAGE_MB = float(os.getenv("MAX_IMAGE_MB", "6"))
MAX_IMAGE_BYTES = int(MAX_IMAGE_MB * 1024 * 1024)
# Tamano maximo del body de cualquier request. Protege contra payloads gigantes.
MAX_REQUEST_MB = float(os.getenv("MAX_REQUEST_MB", "12"))
MAX_REQUEST_BYTES = int(MAX_REQUEST_MB * 1024 * 1024)
# TTL de las URLs firmadas de comprobantes (segundos).
SIGNED_URL_TTL = int(os.getenv("SIGNED_URL_TTL", "3600"))
# Bucket (privado) de comprobantes.
COMPROBANTES_BUCKET = os.getenv("COMPROBANTES_BUCKET", "comprobantes")
# URL del frontend a la que apunta el email de recuperacion de contrasena.
RESET_REDIRECT_URL = os.getenv(
    "RESET_REDIRECT_URL", "http://localhost:5173/#/reset-password"
)

# --- Observabilidad / red ---
# Origenes permitidos por CORS. Por defecto: dev local + esquemas del WebView
# de Capacitor (Android). Agregar el dominio web de produccion si lo hubiera.
_DEFAULT_CORS = "http://localhost:5173,http://localhost,https://localhost,capacitor://localhost"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_CORS).split(",") if o.strip()]
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
# Error tracking opcional: si SENTRY_DSN no esta seteado, Sentry no se inicializa.
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
