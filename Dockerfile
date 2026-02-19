FROM node:20
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p temp && chmod 777 temp
EXPOSE 10000
CMD ["node", "server.js"]