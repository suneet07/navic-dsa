#!/usr/bin/env bash
# Vercel build step (runs on Vercel's Linux build machine).
set -euo pipefail

echo "▶ Compiling C++ engine"
make -C dsa -j"$(nproc)"

echo "▶ Converting OSM graph for the engine"
node backend/scripts/prepare-data.js

echo "▶ Building React frontend"
npm --prefix frontend run build

# 16 MB offline road map: too big for a function response, so ship it as a static file.
cp data/network.geojson frontend/dist/network.geojson
echo "✔ Build complete"
