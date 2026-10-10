#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The landing page has no dependencies, build step, or database migrations.
node --input-type=module -e 'if (Number(process.versions.node.split(".")[0]) < 22) { throw new Error("Sauce requires Node.js 22 or newer"); }'
node --check landing/server.mjs
node --check landing/public/app.js
echo "Post-merge setup complete."
