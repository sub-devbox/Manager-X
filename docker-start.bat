@echo off
setlocal
title Manager X - Starting Docker Containers

echo ====================================================
echo        Manager X - Starting Docker Services
echo ====================================================

docker compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start Docker containers.
    echo Please make sure Docker Desktop is installed and running.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  Docker containers successfully started!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:8000 (Docs: /docs)
echo ====================================================
echo  To view container logs: docker compose logs -f
echo  To stop containers:     docker-stop.bat
echo ====================================================
echo.
pause
