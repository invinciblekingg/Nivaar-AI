import os
import sys
import subprocess

def main():
    port = os.getenv("PORT", "10000")
    print("=" * 60)
    print(f"  NIVAAR AI PLATFORM — RENDER WEB SERVICE")
    print(f"  Binding to 0.0.0.0:{port}")
    print("=" * 60)

    # 1. Initialize DB tables & seed baseline machines across all 8 categories
    try:
        from backend.app.database import engine, Base
        from backend.app.seed_data import seed_database
        Base.metadata.create_all(bind=engine)
        seed_database()
        print("Database schema and machine datasets verified.")
    except Exception as e:
        print(f"Startup notice during DB init: {e}")

    # 2. Launch Uvicorn with auto-detection of workers
    cmd = [
        sys.executable, "-m", "uvicorn",
        "backend.app.main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--forwarded-allow-ips", "*"
    ]
    sys.exit(subprocess.call(cmd))

if __name__ == "__main__":
    main()
