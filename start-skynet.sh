#!/bin/bash

# Inicia o Bunker Chrome em background
echo "SKYNET: Iniciando Bunker Chrome (CDP 9222)..."
chromium --headless --remote-debugging-port=9222 --no-sandbox --disable-dev-shm-usage --disable-gpu &

# Aguarda o Chrome subir
sleep 5

# Inicia o motor cngsmOS
echo "SKYNET: Iniciando Motor cngsmOS v3.0..."
npm start
