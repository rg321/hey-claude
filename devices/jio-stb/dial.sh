#!/bin/bash
# Jio STB DIAL control — launch/stop apps
# Usage: dial.sh youtube [videoId] | netflix | stop <appName>

set -e

ROOT_DIR="$HOME/ai/home_assistant"
CONFIG="$ROOT_DIR/config.json"
STB_IP=$(jq -r '.stb.ip' "$CONFIG")
DIAL_PORT=52235

CMD="${1:-}"
ARG="${2:-}"

case "$CMD" in
  youtube)
    if [ -n "$ARG" ]; then
      curl -s -X POST "http://${STB_IP}:${DIAL_PORT}/apps/YouTube" \
        -H "Content-Type: text/plain" -d "v=${ARG}" > /dev/null
      echo "YouTube launched with video $ARG"
    else
      curl -s -X POST "http://${STB_IP}:${DIAL_PORT}/apps/YouTube" \
        -H "Content-Length: 0" > /dev/null
      echo "YouTube launched"
    fi
    ;;

  netflix)
    curl -s -X POST "http://${STB_IP}:${DIAL_PORT}/apps/Netflix" \
      -H "Content-Length: 0" > /dev/null
    echo "Netflix launched"
    ;;

  stop)
    APP="${ARG:-YouTube}"
    curl -s -X DELETE "http://${STB_IP}:${DIAL_PORT}/apps/${APP}/run" > /dev/null
    echo "Stopped $APP"
    ;;

  status)
    APP="${ARG:-YouTube}"
    curl -s "http://${STB_IP}:${DIAL_PORT}/apps/${APP}"
    ;;

  *)
    echo "Usage: dial.sh youtube [videoId] | netflix | stop <appName> | status [appName]"
    ;;
esac
