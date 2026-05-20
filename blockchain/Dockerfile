# syntax=docker/dockerfile:1.7
FROM node:22-alpine
WORKDIR /app

# git + python needed for some hardhat transitive deps
RUN apk add --no-cache git python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

# contracts, scripts, config, tests
COPY hardhat.config.js ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY test ./test

# compile once at build time so first boot is fast
RUN npx hardhat compile

EXPOSE 8545

# default command: long-running hardhat node bound to all interfaces
# so other containers can reach it. host stays unreachable unless
# we expose 8545 in compose.
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
