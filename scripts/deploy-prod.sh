#!/usr/bin/env bash
# Deploy Convex functions to PRODUCTION (proficient-porpoise-196).
#
# .env.local contains CONVEX_DEPLOYMENT=dev:... which the Convex CLI
# always reads with higher priority than env vars. We must temporarily
# rename it so the deploy key targets prod correctly.
#
# Usage: ./scripts/deploy-prod.sh

set -euo pipefail

DEPLOY_KEY="prod:proficient-porpoise-196|eyJ2MiI6ImQwODViNzhlZTIwMTQwMGE4MWI2ZTVjYzAyNzE1Y2E4In0="

# Safety: must be on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "ERROR: Must be on main branch to deploy to prod (currently on $BRANCH)"
  exit 1
fi

# Move .env.local out of the way
if [ -f .env.local ]; then
  mv .env.local .env.local.bak
  trap 'mv .env.local.bak .env.local' EXIT
fi

echo "Deploying to prod (proficient-porpoise-196)..."
CONVEX_DEPLOY_KEY="$DEPLOY_KEY" npx convex deploy -y

echo "✓ Production deploy complete"
