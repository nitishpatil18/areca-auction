# syntax=docker/dockerfile:1.7

# ----- deps stage: install only production dependencies --------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ----- runtime stage --------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

# non-root user (alpine ships with node:1000 already)
USER node

ENV NODE_ENV=production
ENV PORT=8000

# copy installed deps first (changes rarely, good for layer caching)
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

# copy source (changes often, last so the deps layer stays cached)
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

EXPOSE 8000

# healthcheck hits the /health endpoint the server already exposes
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://localhost:8000/health || exit 1

CMD ["node", "src/server.js"]
