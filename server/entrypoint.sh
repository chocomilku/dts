#!/bin/sh
set -e

echo "Running migrations...\n"
bunx --bun drizzle-kit migrate

echo "\n\nEnvironment: $NODE_ENV \n"

if [ "$NODE_ENV" = "production" ]; then
    bun run start
else 
    bun run dev
fi
