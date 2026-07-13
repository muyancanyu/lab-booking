@echo off
chcp 65001 >nul
title SmartLab 机房预约系统
echo.
echo ================================
echo   SmartLab 机房预约系统
echo ================================
echo.
echo 正在启动服务...
echo.
taskkill /f /im node.exe >nul 2>&1
start http://localhost:3000
npm run dev