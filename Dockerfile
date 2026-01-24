FROM node:22-slim

# Instal Chromium untuk WhatsApp-Web.js
RUN apt-get update && apt-get install -y \
    chromium \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
# Instal dependencies dan prisma client
RUN npm install

# Salin folder prisma untuk menjalankan migrasi dan seed
COPY prisma ./prisma
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5500

# Script untuk menjalankan migrasi, seed, lalu start server
CMD npx prisma migrate deploy && npx prisma db seed && node server.js
