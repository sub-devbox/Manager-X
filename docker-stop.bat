@echo off
setlocal
title Manager X - Stopping Docker Containers

echo ====================================================
echo        Manager X - Stopping Docker Services
echo ====================================================

docker compose down

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to stop Docker containers.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  Docker containers stopped cleanly.
echo ====================================================
timeout /t 3 >nul
