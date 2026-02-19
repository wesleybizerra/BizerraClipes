FROM node:20
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/temp && chmod 777 /app/temp
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]