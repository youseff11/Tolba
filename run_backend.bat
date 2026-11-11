@echo off
REM Django backend on http://127.0.0.1:8000
cd /d "%~dp0backend"
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
