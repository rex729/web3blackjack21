# Build Stage
FROM node:20-slim AS builder

# Install build deps and OpenSSL for Prisma compatibility
RUN apt-get update && apt-get install -y build-essential python3 make openssl ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Production Stage
FROM node:20-slim

# Install runtime OpenSSL dependency
RUN apt-get update && apt-get install -y openssl ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose the port
EXPOSE 4000

# Environment variables (defaults)
ENV PORT=4000

# Initialize DB (create sqlite file) before starting the server
CMD ["sh", "-c", "npx prisma db push && npm start"]
