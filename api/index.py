"""
Vercel Serverless Function entrypoint for Nivaar AI Backend (FastAPI).
Routes all /api/* requests to the FastAPI application instance.
"""
import os
import sys
import logging

# Ensure the repository root is on sys.path so backend, ml, and workers can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Mark serverless environment
os.environ["VERCEL"] = "1"

logger = logging.getLogger("vercel.entrypoint")

try:
    from backend.app.main import app
except Exception as e:
    logger.exception(f"Error loading FastAPI app in Vercel: {e}")
    from fastapi import FastAPI
    app = FastAPI(title="Nivaar AI (Recovery Mode)")
    
    @app.get("/api/health")
    @app.get("/health")
    def error_health():
        return {
            "status": "degraded",
            "message": "Nivaar AI loaded in recovery mode",
            "error": str(e)
        }

# Vercel ASGI handler
app = app
