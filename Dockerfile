FROM node:20-bullseye
# Instalar FFmpeg e Python (necessário para yt-dlp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*
# Instalar yt-dlp via pip
RUN pip3 install yt-dlp
WORKDIR /app
# Copiar arquivos de dependências
COPY package*.json ./
# Instalar dependências
RUN npm install
# Copiar todo o código
COPY . .
# Build do frontend (Vite)
RUN npm run build
# Porta padrão ou 3000
ENV PORT=3000
EXPOSE 3000
# Comando para iniciar o servidor
CMD ["node", "server.js"]