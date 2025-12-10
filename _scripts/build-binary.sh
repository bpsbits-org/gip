#!/bin/bash
set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf /tmp/gip
cp -a "${PROJECT_DIR}" /tmp/gip
rm -rf /tmp/gip/data
rm -rf /tmp/gip/_scripts
cd /tmp/gip
npm run uninstall-unix
npm install
npm run build
cp gip "${PROJECT_DIR}/dist/gip"
echo "Binary ready → ${PROJECT_DIR}/dist/gip"