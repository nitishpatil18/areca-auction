#!/bin/sh
set -e

SHARED_ENV="/shared/contract.env"
SHARED_ABI="/shared/abi/ArecaAuction.json"
TARGET_ABI="/app/src/abi/ArecaAuction.json"

# wait up to 60s for deploy to drop the env file
WAITED=0
while [ ! -f "$SHARED_ENV" ] && [ $WAITED -lt 60 ]; do
  echo "[entrypoint] waiting for $SHARED_ENV ($WAITED/60)..."
  sleep 1
  WAITED=$((WAITED + 1))
done

if [ -f "$SHARED_ENV" ]; then
  echo "[entrypoint] loading $SHARED_ENV"
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$SHARED_ENV" | xargs)
else
  echo "[entrypoint] WARNING: $SHARED_ENV not found after 60s; chain disabled"
fi

if [ -f "$SHARED_ABI" ]; then
  echo "[entrypoint] copying abi from $SHARED_ABI"
  cp "$SHARED_ABI" "$TARGET_ABI"
else
  echo "[entrypoint] WARNING: $SHARED_ABI not found; using image-baked abi"
fi

exec node src/server.js
