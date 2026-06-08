"""Configura el entorno para que los modulos del backend importen sin credenciales
reales. create_client()/genai.Client() no hacen llamadas de red al construirse, asi
que con un token fake de role=service_role basta para pasar el fail-fast de config.py."""
import base64
import json
import os

_payload = base64.urlsafe_b64encode(json.dumps({"role": "service_role"}).encode()).decode().rstrip("=")

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", f"eyJhbGciOiJIUzI1NiJ9.{_payload}.sig")
os.environ.setdefault("GEMINI_API_KEY", "test")
