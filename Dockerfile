# Usa a imagem oficial do Node.js 18 (Debian Slim para ser leve)
FROM node:18-slim

# Instala dependências do sistema: FFmpeg e Python3 (necessário para o yt-dlp rodar)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instala o yt-dlp (ferramenta de download) e dá permissão de execução
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Define a pasta de trabalho dentro do servidor
WORKDIR /app

# Copia os arquivos de configuração primeiro para agilizar o cache de instalação
COPY package.json ./

# Instala apenas as dependências necessárias para rodar (economiza espaço)
RUN npm install --production

# Copia os arquivos do seu servidor para dentro do container
COPY server.js ./

# Cria a pasta 'temp' onde os vídeos serão processados e dá permissão total
RUN mkdir -p temp && chmod 777 temp

# O Render usa portas variadas, mas geralmente a 10000 é o padrão
EXPOSE 10000

# Comando final que liga o seu motor de clips
CMD ["node", "server.js"]