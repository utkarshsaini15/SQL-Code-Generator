@echo off
REM ============================================================
REM  CodeForge AI - one-click launcher for Windows
REM ============================================================
title CodeForge AI

echo Starting CodeForge AI...
echo.

REM Make sure the Ollama server is running in the background.
where ollama >nul 2>nul
if %errorlevel%==0 (
    echo Ensuring Ollama is running...
    start "" /B ollama serve >nul 2>nul
    timeout /t 2 >nul
) else (
    echo [WARN] Ollama not found on PATH. Install it from https://ollama.com
)

REM Launch the Flask app. 'py' is the Windows Python launcher.
py app.py
if %errorlevel% neq 0 (
    echo.
    echo 'py' failed - trying 'python' instead...
    python app.py
)

pause
