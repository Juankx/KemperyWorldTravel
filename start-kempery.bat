@echo off
REM Script para iniciar Kempery Frontend y Backend correctamente

echo ========================================
echo  KEMPERY SYSTEM STARTER
echo ========================================
echo.

REM Matar procesos node existentes
echo Deteniendo procesos anteriores...
taskkill /F /IM node.exe 2>NUL
timeout /t 2 /nobreak

REM Iniciar Backend en puerto 5000
echo.
echo Iniciando Backend en puerto 5000...
start cmd /k "cd /d C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\backend && echo Backend iniciando... && timeout /t 2 /nobreak && node server-mock.js"

timeout /t 5 /nobreak

REM Iniciar Frontend en puerto 3000
echo Iniciando Frontend en puerto 3000...
start cmd /k "cd /d C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\frontend && echo Frontend iniciando... && npm run dev"

timeout /t 3 /nobreak

echo.
echo ========================================
echo  SISTEMAS INICIADOS
echo ========================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:5000
echo.
echo Usuario: cobranzas@kempery.com
echo Contrasena: Kempery2025+
echo.
echo Abriendo navegador...
start http://localhost:3000

timeout /t 10
