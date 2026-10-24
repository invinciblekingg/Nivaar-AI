import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "frontend" / ".env")

# Detect Vercel / serverless / AWS Lambda environment
IS_VERCEL = (
    os.getenv("VERCEL") == "1" or 
    os.getenv("VERCEL_ENV") is not None or 
    os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None or
    not os.access(str(BASE_DIR), os.W_OK)
)

class Settings:
    PROJECT_NAME: str = "Udyon"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    BASE_DIR: Path = BASE_DIR
    
    # Database
    if IS_VERCEL:
        _tmp = Path("/tmp")
        DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_tmp / 'machineguard.db'}")
        STORAGE_DIR: Path = _tmp / "storage"
        UPLOAD_DIR: Path = _tmp / "storage" / "uploads"
        REPORTS_DIR: Path = _tmp / "storage" / "reports"
    else:
        DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'machineguard.db'}")
        STORAGE_DIR: Path = BASE_DIR / "storage"
        UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
        REPORTS_DIR: Path = BASE_DIR / "storage" / "reports"

    DEMO_DATA_DIR: Path = BASE_DIR / "demo_data"
    
    # Redis / Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    
    # Workers & Recovery
    WORKER_HEARTBEAT_TIMEOUT_SEC: int = int(os.getenv("WORKER_HEARTBEAT_TIMEOUT_SEC", "15"))
    JOB_LEASE_TIMEOUT_SEC: int = int(os.getenv("JOB_LEASE_TIMEOUT_SEC", "25"))
    MAX_JOB_ATTEMPTS: int = 3
    
    # Security & CORS
    CORS_ORIGINS: list[str] = ["*"]
    SECRET_KEY: str = os.getenv("SECRET_KEY", "machineguard-super-secret-key-for-hackathon-2026")

    # Supabase Configuration
    _raw_supabase_url: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "")))
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Storage bucket names
    SUPABASE_BUCKET_IMAGES: str = os.getenv("SUPABASE_BUCKET_IMAGES", "machine-images")
    SUPABASE_BUCKET_DATASETS: str = os.getenv("SUPABASE_BUCKET_DATASETS", "telemetry-datasets")
    SUPABASE_BUCKET_REPORTS: str = os.getenv("SUPABASE_BUCKET_REPORTS", "diagnostic-reports")

    @property
    def SUPABASE_URL(self) -> str:
        url = self._raw_supabase_url.strip()
        # If user passed a publishable key or reference instead of full URL, resolve to https://<ref>.supabase.co
        if url.startswith("http://") or url.startswith("https://"):
            return url.rstrip("/")
        # Try decoding ref from anon key JWT if available
        if self.SUPABASE_KEY and "." in self.SUPABASE_KEY:
            try:
                import base64, json
                parts = self.SUPABASE_KEY.split(".")
                if len(parts) >= 2:
                    payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
                    ref = payload.get("ref")
                    if ref:
                        return f"https://{ref}.supabase.co"
            except Exception:
                pass
        # Default fallback if known
        if "riwhpkqyhinysukujzfe" in self.SUPABASE_KEY:
            return "https://riwhpkqyhinysukujzfe.supabase.co"
        return url

settings = Settings()

# Ensure directories exist safely
try:
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    settings.DEMO_DATA_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
