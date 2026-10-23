"""
Vercel Serverless Function entrypoint for Nivaar AI Backend (FastAPI).
Routes all /api/* requests to the FastAPI application instance.
"""
import os
import sys

# Ensure the repository root is on sys.path so backend, ml, and workers can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Import the configured FastAPI application instance
from backend.app.main import app

# Vercel ASGI Handler
app = app
