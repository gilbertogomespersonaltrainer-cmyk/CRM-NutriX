#!/bin/bash
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/.."
exec node node_modules/.bin/next dev --port 3000
