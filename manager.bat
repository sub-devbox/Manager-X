@echo off
setlocal
set "ROOT_DIR=%~dp0"

if "%~1"=="start" goto do_start
if "%~1"=="stop" goto do_stop
if "%~1"=="restart" goto do_restart
if "%~1"=="docker-start" goto do_docker_start
if "%~1"=="docker-stop" goto do_docker_stop

:menu
cls
echo ====================================================
echo                 MANAGER X CONTROL MENU
echo ====================================================
echo  1. Start Local Servers (Backend + Frontend)
echo  2. Stop Local Servers
echo  3. Restart Local Servers
echo  4. Start Docker Containers (docker compose)
echo  5. Stop Docker Containers
echo  6. Exit
echo ====================================================
set /p choice="Select an option [1-6]: "

if "%choice%"=="1" goto do_start
if "%choice%"=="2" goto do_stop
if "%choice%"=="3" goto do_restart
if "%choice%"=="4" goto do_docker_start
if "%choice%"=="5" goto do_docker_stop
if "%choice%"=="6" exit /b 0
goto menu

:do_start
call "%ROOT_DIR%start.bat"
exit /b 0

:do_stop
call "%ROOT_DIR%stop.bat"
exit /b 0

:do_restart
echo Restarting Manager X services...
call "%ROOT_DIR%stop.bat"
timeout /t 2 >nul
call "%ROOT_DIR%start.bat"
exit /b 0

:do_docker_start
call "%ROOT_DIR%docker-start.bat"
exit /b 0

:do_docker_stop
call "%ROOT_DIR%docker-stop.bat"
exit /b 0
