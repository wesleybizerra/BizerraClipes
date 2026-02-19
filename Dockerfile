# Base image: Node.js 20 on Debian Slim for stability
FROM node:20-slim
# Install FFmpeg, system tools, and clear cache to reduce size
RUN apt-get update && \
apt-get install -y ffmpeg build-essential python3 curl && \
apt-get clean && \
rm -rf /var/lib/apt/lists/*
# Application working directory
WORKDIR /app
# Optimization: install dependencies separately to leverage cache
COPY package*.json ./
RUN npm install --omit=dev
# Copy all source files
COPY . .
# Prep processing directory
RUN mkdir -p /app/temp && chmod 777 /app/temp
# Define critical runtime variables
ENV NODE_ENV=production
ENV PORT=10000
# Open the application port
EXPOSE 10000
# Execution entrypoint
CMD ["node", "server.js"]