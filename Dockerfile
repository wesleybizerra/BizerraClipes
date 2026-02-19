# Estágio de Build para o Frontend React
FROM node:20 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Estágio de Produção: Servidor Node.js unificado
FROM node:20-slim
WORKDIR /app
# Instalação do FFmpeg para o processamento de vídeos (Motor V10)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Instalação apenas das dependências de produção do backend
COPY package*.json ./
RUN npm install --omit=dev
# Copia o código do servidor unificado
COPY server.js ./
# Copia o frontend buildado do estágio anterior para ser servido pelo Express
COPY --from=build-stage /app/dist ./dist
# Garante que o diretório temporário para uploads exista e tenha permissões
RUN mkdir -p temp && chmod 777 temp
# Configurações de ambiente para o Railway
ENV PORT=8080
ENV NODE_ENV=production
# Expõe a porta configurada
EXPOSE 8080
# Comando para iniciar o Motor Bizerra
CMD ["node", "server.js"]