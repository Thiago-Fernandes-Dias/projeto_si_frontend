#!/bin/sh
set -eu

case "${DEBUG_LOGS:-false}" in
  true|TRUE|1|yes|YES|on|ON)
    debug_flag="true"
    ;;
  *)
    debug_flag="false"
    ;;
esac

cat > /usr/share/nginx/html/runtime-config.json <<EOF
{"debugLogs": ${debug_flag}}
EOF
