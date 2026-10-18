@echo off
title Launch Intelligent Library Management System
echo ==============================================================
echo Launching Intelligent & Personalized Library Management System
echo ==============================================================

echo 1. Starting Backend API Server in new window...
start "Library System - Backend (FastAPI)" cmd /c "start_backend.bat"

echo 2. Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo 3. Starting Frontend React App in new window...
start "Library System - Frontend (React Vite)" cmd /c "start_frontend.bat"

echo.
echo Both servers have been launched!
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo - Default Librarian Login: admin / admin123
echo.
pause

