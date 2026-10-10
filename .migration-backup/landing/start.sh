#!/bin/sh
set -eu
if [ "$(id -u)" = 0 ]; then
  mkdir -p /data
  chown node:node /data
  chmod 700 /data
  exec su node -s /bin/sh -c 'exec node server.mjs'
fi
exec node server.mjs
