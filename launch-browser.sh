#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_DATA_DIR="$SCRIPT_DIR/.cngsm/browser-profile"
PROFILE="AntigravityAgent"

echo "[cngsmOS] Iniciando Chrome Isolado (Linux/VPS)..."
mkdir -p "$USER_DATA_DIR"

# VPS: --headless por padrão, --no-sandbox para containers
google-chrome --headless --user-data-dir="$USER_DATA_DIR" --profile-directory="$PROFILE" --remote-debugging-port=9222 --disable-gpu --no-sandbox --no-first-run
echo "[cngsmOS] Navegador isolado ativo em background. Porta: 9222"
