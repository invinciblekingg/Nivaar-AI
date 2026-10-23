import os
import sys

# Ensure repository root is on sys.path so backend, ml, and workers can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
for p in [ROOT_DIR, CURRENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ["VERCEL"] = "1"

from backend.app.database import engine, Base
from backend.app.seed_data import seed_database
from backend.app.main import app

# Auto-initialize database tables and seed data on cold start
try:
    Base.metadata.create_all(bind=engine)
    seed_database()
except Exception:
    pass

app = app
