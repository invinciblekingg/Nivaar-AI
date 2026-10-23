import os
import sys
import time
import subprocess
import signal

def main():
    print("=" * 70)
    print("  MACHINEGUARD AI — DISTRIBUTED PREDICTIVE MAINTENANCE PLATFORM")
    print("  Tagline: Predict Failures. Prevent Disruptions.")
    print("=" * 70)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    # 1. Initialize and Seed Database
    print("\n[1/3] Initializing Database & Machine Profiles across 8 Categories...")
    subprocess.run([sys.executable, "-m", "backend.app.seed_data"], check=True)

    # 2. Launch FastAPI Backend Server
    print("\n[2/3] Starting FastAPI Backend on http://localhost:8000...")
    backend_cmd = [
        sys.executable, "-m", "uvicorn", 
        "backend.app.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=base_dir)

    # Wait for backend to initialize
    time.sleep(2)

    # 3. Launch Vite React Frontend
    print("\n[3/3] Starting React Vite Frontend on http://localhost:5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_dir = os.path.join(base_dir, "frontend")
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

    print("\n" + "*" * 70)
    print("  MACHINEGUARD AI IS FULLY OPERATIONAL!")
    print("  Frontend UI Dashboard: http://localhost:5173")
    print("  FastAPI Backend API:   http://localhost:8000")
    print("  Swagger Documentation: http://localhost:8000/docs")
    print("  Active AI Workers:     Worker Alpha & Worker Beta (Online)")
    print("*" * 70)
    print("\nPress CTRL+C at any time to gracefully terminate all services.\n")

    def handle_exit(sig, frame):
        print("\nShutting down MachineGuard AI services...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        handle_exit(None, None)

if __name__ == "__main__":
    main()
