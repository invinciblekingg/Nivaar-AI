import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.seed_data import seed_database
from backend.app.ws.manager import ws_manager
from workers.distributed_engine import fleet_supervisor

# API Routers
from backend.app.api.machines import router as machines_router
from backend.app.api.telemetry import router as telemetry_router
from backend.app.api.diagnostics import router as diagnostics_router
from backend.app.api.distributed import router as distributed_router
from backend.app.api.maintenance import router as maintenance_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.reports import router as reports_router
from backend.app.api.demo import router as demo_router
from backend.app.api.teng import router as teng_router
from backend.app.api.vision import router as vision_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.symbiosis import router as symbiosis_router
from backend.app.api.symbiosis_marketplace import router as symbiosis_marketplace_router


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("machineguard.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist, seed demo datasets, initialize worker fleet
    logger.info("Initializing Udyon Platform...")
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
        from backend.app.config import IS_VERCEL
        if not IS_VERCEL:
            fleet_supervisor.initialize_fleet()
        logger.info("Udyon Engine online.")
    except Exception as e:
        logger.warning(f"Startup initialization notice: {e}")
    yield
    # Shutdown
    logger.info("Shutting down Udyon services...")

app = FastAPI(
    title="Udyon",
    version=settings.VERSION,
    description="Udyon: Intelligent Distributed Predictive Maintenance Platform",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_serverless_db_ready = False

@app.middleware("http")
async def ensure_serverless_db_ready(request, call_next):
    global _serverless_db_ready
    if not _serverless_db_ready:
        try:
            Base.metadata.create_all(bind=engine)
            seed_database()
            _serverless_db_ready = True
        except Exception as err:
            logger.warning(f"Serverless DB middleware init: {err}")
    return await call_next(request)


# Register Routers (with and without prefix so serverless rewrites never fail)
ALL_ROUTERS = [
    machines_router, telemetry_router, diagnostics_router,
    distributed_router, maintenance_router, incidents_router,
    reports_router, demo_router, teng_router, vision_router,
    symbiosis_router, symbiosis_marketplace_router, alerts_router
]
for r in ALL_ROUTERS:
    app.include_router(r, prefix=settings.API_PREFIX)
    app.include_router(r)


@app.get("/api")
@app.get("/api/")
def api_root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "operational",
        "health": "/api/health",
        "docs": "/docs"
    }

@app.get("/api/health")
@app.get("/health")
def health_check():
    workers_count = 2
    try:
        workers_count = fleet_supervisor.get_status_summary()["active_workers_count"]
    except Exception:
        pass
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
        "distributed_workers": workers_count
    }



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)


# -----------------------------------------------------------------------------
# Static Files & SPA Fallback (Enables Render, Docker, and Production Deployments)
# -----------------------------------------------------------------------------
STATIC_CANDIDATES = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent.parent / "dist",
]

STATIC_DIR = None
for candidate in STATIC_CANDIDATES:
    if candidate.exists() and (candidate / "index.html").exists():
        STATIC_DIR = candidate
        break

if STATIC_DIR:
    logger.info(f"Mounting production frontend distribution from {STATIC_DIR}")
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Do not intercept API, websocket, or interactive docs endpoints
        if (
            full_path.startswith("api")
            or full_path.startswith("ws")
            or full_path in ["docs", "openapi.json", "redoc"]
        ):
            raise HTTPException(status_code=404, detail="Endpoint not found")

        # Specific static file request (e.g. /favicon.svg, /nivaar_logo.jpg)
        target_file = STATIC_DIR / full_path
        if full_path and target_file.exists() and target_file.is_file():
            return FileResponse(target_file)

        # React client-side route fallback
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
