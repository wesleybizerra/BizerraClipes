# Stage 1: Build the frontend
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Stage 2: Production environment
FROM node:20-slim
WORKDIR /app
# Install FFmpeg and essential tools for the Bizerra Nitro Engine
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*
# Copy build artifacts and server files from build-stage
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/package*.json ./
COPY --from=build-stage /app/server.js ./
# Install only production dependencies
RUN npm install --omit=dev
# Configure temporary directory for video processing
RUN mkdir -p temp && chmod 777 temp
# Environment variables for Railway optimization
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
# Start the Nitro Motor
CMD ["node", "server.js"]