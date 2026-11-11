@echo off
REM One-time setup: Python venv + Django deps + database, and npm packages
cd /d "%~dp0backend"
if not exist .venv python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
if not exist .env copy .env.example .env
.venv\Scripts\python manage.py migrate
cd /d "%~dp0frontend"
call npm install
echo.
echo Done. Create an admin user with:  backend\.venv\Scripts\python backend\manage.py createsuperuser
pause
