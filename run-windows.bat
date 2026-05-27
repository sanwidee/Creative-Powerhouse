@echo off
setlocal enabledelayedexpansion

REM #######################################
REM # Creative Powerhouse - One-Click Start
REM # For Windows
REM #######################################

title Creative Powerhouse

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║          🚀 CREATIVE POWERHOUSE - STARTUP                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

REM Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   X Node.js not found!
    echo   Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo   √ Node.js %NODE_VERSION% found

REM Check Python (general)
echo [2/5] Checking Python...
set PYTHON_CMD=
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
) else (
    where python3 >nul 2>nul
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python3
    )
)

if "%PYTHON_CMD%"=="" (
    echo   X Python not found!
    echo   Please install Python 3.9+ from https://python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('%PYTHON_CMD% --version 2^>^&1') do set PYTHON_VERSION=%%i
echo   √ %PYTHON_VERSION% found (general)

REM Check Python 3.11 for voice server (TTS requirement)
echo [2.5/5] Checking Python 3.11 for voice server...
set PYTHON311_CMD=

REM Try py launcher first (most reliable on Windows)
py -3.11 --version >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON311_CMD=py -3.11
    goto :python311_found
)

REM Check common Windows installation paths
if exist "C:\Python311\python.exe" (
    set PYTHON311_CMD=C:\Python311\python.exe
    goto :python311_found
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set PYTHON311_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe
    goto :python311_found
)

REM Python 3.11 not found
echo   ! Python 3.11 not found (required for voice cloning)
echo   Voice cloning will be disabled
echo   To enable, install Python 3.11 from https://python.org/downloads/release/python-3119/
goto :python311_done

:python311_found
for /f "tokens=*" %%i in ('!PYTHON311_CMD! --version 2^>^&1') do echo   √ %%i found for voice server

:python311_done

REM Check ffmpeg
echo [3/5] Checking ffmpeg...
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    echo   √ ffmpeg found
) else (
    echo   ! ffmpeg not found (voice cloning will be disabled^)
    echo   Install from: https://ffmpeg.org/download.html
)

REM Install Node.js dependencies
echo.
echo [4/5] Installing Node.js dependencies...
if not exist "node_modules" (
    call npm install
    echo   √ Node modules installed
) else (
    echo   √ Node modules already installed
)

REM Install Python dependencies
echo [5/5] Setting up Python voice server...
if exist "voice_server" (
    REM Only proceed if Python 3.11 is available
    if defined PYTHON311_CMD (
        cd voice_server
        
        REM Create virtual environment with Python 3.11 if not exists
        if not exist "venv" (
            echo   Creating Python 3.11 virtual environment...
            !PYTHON311_CMD! -m venv venv
        )
        
        REM Activate and install dependencies
        if not exist "venv\.installed" (
            echo   Installing Python dependencies (this may take a while^)...
            call venv\Scripts\activate.bat
            pip install --upgrade pip -q
            pip install -r requirements.txt
            if %errorlevel% equ 0 (
                echo. > venv\.installed
                echo   √ Python dependencies installed
            ) else (
                echo   X Failed to install dependencies
                echo   Try: rmdir /s /q voice_server\venv and run again
            )
        ) else (
            echo   √ Python dependencies already installed
        )
        
        cd ..
    ) else (
        echo   ! Skipping voice server setup (Python 3.11 required^)
        echo   Install Python 3.11 from https://python.org/downloads/release/python-3119/
    )
) else (
    echo   ! Voice server directory not found
)

REM Create necessary directories
if not exist "database" mkdir database
if not exist "voice_dna" mkdir voice_dna

echo.
echo ═══════════════════════════════════════════════════════════
echo   All dependencies ready! Starting servers...
echo ═══════════════════════════════════════════════════════════
echo.

REM Start Node.js backend
echo Starting Node.js storage server...
start "Storage Server" /min cmd /c "node server.js"
timeout /t 1 >nul
echo   √ Storage server running on http://localhost:3001

REM Start Python voice server (if Python 3.11 was available)
if exist "voice_server\venv" if defined PYTHON311_CMD (
    echo Starting Python voice server...
    start "Voice Server" /min cmd /c "cd voice_server && venv\Scripts\activate.bat && python main.py"
    timeout /t 2 >nul
    echo   √ Voice server running on http://localhost:8000
)

REM Start frontend
echo Starting frontend...
start "Frontend" cmd /c "npm run client"
timeout /t 3 >nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  √ CREATIVE POWERHOUSE IS RUNNING!                        ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║  App:           http://localhost:3000                     ║
echo ║  Storage API:   http://localhost:3001                     ║
echo ║  Voice API:     http://localhost:8000                     ║
echo ║                                                           ║
echo ║  Close this window to stop all servers                    ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Open browser
timeout /t 2 >nul
start http://localhost:3000

REM Keep window open
echo Press any key to stop all servers...
pause >nul

REM Kill all servers
taskkill /FI "WINDOWTITLE eq Storage Server*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Voice Server*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>nul

echo.
echo Servers stopped. Goodbye!
timeout /t 2 >nul
