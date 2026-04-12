import os

from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client

load_dotenv()

# --- Supabase ---
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Gemini ---
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
gemini = genai.Client(api_key=GEMINI_API_KEY)
SCAN_MODEL = os.getenv("SCAN_MODEL", "gemini-2.5-flash")
