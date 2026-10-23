import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    PROJECT_NAME: str = "MachineGuard AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'machineguard.db'}")
    
    # Redis / Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    
    # Workers & Recovery
    WORKER_HEARTBEAT_TIMEOUT_SEC: int = int(os.getenv("WORKER_HEARTBEAT_TIMEOUT_SEC", "15"))
    JOB_LEASE_TIMEOUT_SEC: int = int(os.getenv("JOB_LEASE_TIMEOUT_SEC", "25"))
    MAX_JOB_ATTEMPTS: int = 3
    
    # Paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
    REPORTS_DIR: Path = BASE_DIR / "storage" / "reports"
    DEMO_DATA_DIR: Path = BASE_DIR / "demo_data"
    
    # Security & CORS
    CORS_ORIGINS: list[str] = ["*"]
    SECRET_KEY: str = os.getenv("SECRET_KEY", "machineguard-super-secret-key-for-hackathon-2026")

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.DEMO_DATA_DIR.mkdir(parents=True, exist_ok=True)
