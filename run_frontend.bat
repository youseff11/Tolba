@echo off
REM React frontend on http://localhost:5173 (proxies /api to Django)
cd /d "%~dp0frontend"
call npm run dev
