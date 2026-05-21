# syntax=docker/dockerfile:1.7

# dev-mode frontend container. for production builds, write a separate
# Dockerfile.prod that does `vite build` + nginx serve.

FROM node:22-alpine
WORKDIR /app

# install deps separately for layer caching
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

# source files
COPY . .

EXPOSE 5173

# --host 0.0.0.0 so the host machine can reach the dev server
# --strictPort fails fast if 5173 is busy (better than vite silently picking 5174)
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
