@echo off
setlocal
title Manager X - Stopping Services

echo ====================================================
echo            Manager X - Stopping Services
echo ====================================================

:: 1. Terminate Backend (Port 8000)
echo [1/2] Terminating processes on Port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":8000.*LISTENING"') do (
    echo Stopping PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Terminate Frontend (Port 3000)
echo [2/2] Terminating processes on Port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000.*LISTENING"') do (
    echo Stopping PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Also close any command prompt windows titled ManagerX-*
taskkill /FI "WINDOWTITLE eq ManagerX-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ManagerX-Frontend*" /T /F >nul 2>&1

echo.
echo ====================================================
echo  Frontend and Backend servers have been stopped.
echo ====================================================
timeout /t 3 >nul
