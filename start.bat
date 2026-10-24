@echo off
title UDYON Guard AI - Predictive Maintenance Platform
echo ======================================================================
echo   UDYON GUARD AI - Starting Local Services
echo ======================================================================

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+.
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js 18+.
    pause
    exit /b 1
)

python run_dev.py
