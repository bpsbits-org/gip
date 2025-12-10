#!/bin/bash
set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -f "${PROJECT_DIR}/dist/gip" "${PROJECT_DIR}/dist/gip.gz"
rm -rf /tmp/gip
cp -a "${PROJECT_DIR}" /tmp/gip
rm -rf /tmp/gip/data /tmp/gip/_scripts /tmp/gip/.idea
cd /tmp/gip
npm run uninstall-unix
npm install
npm run build
cp gip "${PROJECT_DIR}/dist/gip"
gzip -k "${PROJECT_DIR}/dist/gip"
echo "Binary ready → ${PROJECT_DIR}/dist/gip"