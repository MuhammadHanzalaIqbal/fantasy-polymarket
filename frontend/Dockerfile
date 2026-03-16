# Frontend Dockerfile for Fantasy Polymarket MVP
# Dev mode: Vite dev server with HMR
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (use npm ci if lockfile exists, else npm install)
RUN npm install

# Copy source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run dev server; host 0.0.0.0 required for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
