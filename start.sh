#!/bin/sh
set -e

# Start solana-test-validator in background
solana-test-validator --quiet &
VALIDATOR_PID=$!

# Wait for validator to be ready
echo "Waiting for Solana validator..."
for i in $(seq 1 30); do
  if solana cluster-version --url http://localhost:8899 >/dev/null 2>&1; then
    echo "Validator ready."
    break
  fi
  sleep 1
done

# Airdrop SOL to treasury
if [ -n "$TREASURY_ADDRESS" ]; then
  echo "Airdropping 100 SOL to treasury $TREASURY_ADDRESS..."
  solana airdrop 100 "$TREASURY_ADDRESS" --url http://localhost:8899 || echo "Airdrop failed, continuing anyway"
fi

# Start Next.js
exec node server.js
