"""
Standalone backend Vercel serverless function entrypoint.
"""
import os
import sys

# Ensure repository root is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(BACKEND_DIR)

for path in [ROOT_DIR, BACKEND_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

os.environ["VERCEL"] = "1"

from backend.app.database import engine, Base
from backend.app.seed_data import seed_database
from backend.app.main import app

try:
    Base.metadata.create_all(bind=engine)
    seed_database()
except Exception:
    pass

app = app
