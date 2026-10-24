#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  UDYON GUARD AI - Starting Local Services"
echo "======================================================================"

if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "[ERROR] Python 3.10+ is required but not found in PATH."
        exit 1
    else
        PYTHON_CMD=python
    fi
else
    PYTHON_CMD=python3
fi

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 18+ is required but not found in PATH."
    exit 1
fi

$PYTHON_CMD run_dev.py
