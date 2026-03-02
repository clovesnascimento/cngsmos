@echo off
set "SCRIPT_DIR=%~dp0"
set "USER_DATA_DIR=%SCRIPT_DIR%.cngsm\browser-profile"
set "PROFILE=AntigravityAgent"

echo [cngsmOS] Iniciando Chrome Isolado (Windows)...
if not exist "%USER_DATA_DIR%" mkdir "%USER_DATA_DIR%"

start chrome.exe --user-data-dir="%USER_DATA_DIR%" --profile-directory="%PROFILE%" --no-first-run --remote-debugging-port=9222
echo [cngsmOS] Navegador isolado ativo. Perfil: %PROFILE% na Porta 9222
