# syntax=docker/dockerfile:1.7

# ----- deps stage: install only production dependencies --------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ----- runtime stage --------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

USER node

ENV NODE_ENV=production
ENV PORT=8000

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
