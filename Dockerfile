FROM node:20-bullseye

# Instalação de dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    chromium \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Configuração do ambiente
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copia o resto do código
COPY . .

# Permissões para o script de startup
RUN chmod +x start-skynet.sh

# Variáveis de ambiente
ENV DOCKERIZED=true
ENV CHROME_PATH=/usr/bin/chromium

# Portas
EXPOSE 3001 9222

CMD ["./start-skynet.sh"]
