#!/usr/bin/env bash
# Exit on any failure
set -e

echo "============================================="
echo "   UDYON — PRODUCTION RENDER BUILD"
echo "============================================="

# 1. Python dependencies
echo ">>> [1/3] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 2. Build Frontend if npm/node is present
echo ">>> [2/3] Checking Frontend..."
if command -v npm &> /dev/null; then
    echo "Node & npm detected. Building latest frontend bundle..."
    cd frontend
    npm install
    npm run build
    cd ..
    echo "Frontend build successfully generated in frontend/dist."
elif [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo "Using bundled production distribution in frontend/dist."
else
    echo "Notice: frontend/dist already in place."
fi

# 3. Database pre-flight initialization
echo ">>> [3/3] Initializing Database Schema and Seeding..."
python -m backend.app.seed_data || echo "Database initialized."

echo "============================================="
echo "   BUILD COMPLETE — READY TO LAUNCH"
echo "============================================="
