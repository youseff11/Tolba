@echo off
start "VisionSeek backend" cmd /k "%~dp0run_backend.bat"
start "VisionSeek frontend" cmd /k "%~dp0run_frontend.bat"
timeout /t 4 >nul
start http://localhost:5173
