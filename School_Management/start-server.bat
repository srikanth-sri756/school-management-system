@echo off
echo ========================================
echo   Backend Server - Starting
echo ========================================
echo.

cd /d d:\School\school-management-system

echo Checking MongoDB connection...
echo.

echo Starting School Management System backend...
echo Server will run on: http://localhost:3000
echo.

node server.js
