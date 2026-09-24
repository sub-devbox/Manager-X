@echo off
setlocal
title Manager X - Starting Services

set "ROOT_DIR=%~dp0"

echo ====================================================
echo            Manager X - Starting Services
echo ====================================================

:: 1. Start Backend Server (FastAPI on Port 8000)
echo [1/2] Starting Backend Server (http://127.0.0.1:8000)...
start "ManagerX-Backend" cmd /k "cd /d "%ROOT_DIR%backend" && "%ROOT_DIR%backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Start Frontend Server (Next.js on Port 3000)
echo [2/2] Starting Frontend Server (http://localhost:3000)...
start "ManagerX-Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ====================================================
echo  Servers launched in separate console windows!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://127.0.0.1:8000 (Docs: /docs)
echo ====================================================
echo  To stop all servers, run: stop.bat
echo.
pause
