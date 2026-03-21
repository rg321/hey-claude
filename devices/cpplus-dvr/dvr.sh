#!/bin/bash
# CP Plus DVR direct control — snapshot, record, motion detection, info
# Usage: dvr.sh snapshot|record|motion|info [args]

ROOT_DIR="$HOME/ai/home_assistant"
CONFIG="$ROOT_DIR/config.json"
LOG="$ROOT_DIR/devices/cpplus-dvr/dvr.log"

# Read config + discover DVR IP
DVR_IP=$(jq -r '.dvr.ip' "$CONFIG")
DVR_MAC=$(jq -r '.dvr.mac // ""' "$CONFIG")
DVR_USER=$(jq -r '.dvr.user' "$CONFIG")
DVR_PASS=$(jq -r '.dvr.pass' "$CONFIG")

# Discover DVR by MAC if available
if [ -n "$DVR_MAC" ]; then
  ping -c 1 -t 1 "$(jq -r '.tv.broadcast' "$CONFIG")" > /dev/null 2>&1 || true
  FOUND_IP=$(arp -a 2>/dev/null | grep -i "$DVR_MAC" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
  if [ -n "$FOUND_IP" ]; then
    DVR_IP="$FOUND_IP"
    # Update config if changed
    OLD_IP=$(jq -r '.dvr.ip' "$CONFIG")
    if [ "$FOUND_IP" != "$OLD_IP" ]; then
      jq --arg ip "$FOUND_IP" '.dvr.ip = $ip' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
    fi
  fi
fi

BASE_URL="http://${DVR_IP}"
CMD="${1:-}"

dvr_get() {
  curl -s --digest -u "${DVR_USER}:${DVR_PASS}" "${BASE_URL}${1}" --max-time 10
}

case "$CMD" in
  snapshot)
    CHANNEL="${2:-1}"
    OUT="${3:-/tmp/snapshot_ch${CHANNEL}.jpg}"
    curl -s --digest -u "${DVR_USER}:${DVR_PASS}" \
      "${BASE_URL}/cgi-bin/snapshot.cgi?channel=${CHANNEL}" \
      --max-time 10 -o "$OUT"
    if [ -f "$OUT" ] && [ "$(wc -c < "$OUT" | tr -d ' ')" -gt 1000 ]; then
      SIZE=$(wc -c < "$OUT" | tr -d ' ')
      echo "Snapshot saved to $OUT (${SIZE} bytes)"
    else
      echo "Error: snapshot failed or DVR not reachable"
      exit 1
    fi
    ;;

  record)
    CHANNEL="${2:-1}"
    DURATION="${3:-10}"
    SUBTYPE="${4:-0}"
    OUT="${5:-/tmp/clip_ch${CHANNEL}.mp4}"
    RTSP_URL="rtsp://${DVR_USER}:${DVR_PASS}@${DVR_IP}:554/cam/realmonitor?channel=${CHANNEL}&subtype=${SUBTYPE}"
    TIMEOUT=$((DURATION + 15))
    ffmpeg -y -rtsp_transport tcp -i "$RTSP_URL" -t "$DURATION" -c copy "$OUT" \
      > /dev/null 2>&1
    if [ -f "$OUT" ] && [ "$(wc -c < "$OUT" | tr -d ' ')" -gt 1000 ]; then
      SIZE=$(du -h "$OUT" | cut -f1)
      echo "Recorded ${DURATION}s clip to $OUT (${SIZE})"
    else
      echo "Error: recording failed"
      exit 1
    fi
    ;;

  motion)
    ACTION="${2:-}"
    CHANNEL="${3:-0}"
    if [ "$ACTION" = "on" ]; then
      dvr_get "/cgi-bin/configManager.cgi?action=setConfig&MotionDetect[${CHANNEL}].Enable=true"
      echo "Motion detection enabled on channel $((CHANNEL + 1))"
    elif [ "$ACTION" = "off" ]; then
      dvr_get "/cgi-bin/configManager.cgi?action=setConfig&MotionDetect[${CHANNEL}].Enable=false"
      echo "Motion detection disabled on channel $((CHANNEL + 1))"
    else
      RESULT=$(dvr_get "/cgi-bin/configManager.cgi?action=getConfig&name=MotionDetect" | grep "Enable")
      echo "$RESULT"
    fi
    ;;

  info)
    TYPE=$(dvr_get "/cgi-bin/magicBox.cgi?action=getDeviceType")
    SERIAL=$(dvr_get "/cgi-bin/magicBox.cgi?action=getSerialNo")
    SW=$(dvr_get "/cgi-bin/magicBox.cgi?action=getSoftwareVersion")
    echo "$TYPE"
    echo "$SERIAL"
    echo "$SW"
    ;;

  *)
    echo "Usage: dvr.sh snapshot|record|motion|info [args]"
    echo ""
    echo "  snapshot [channel]              Take a JPEG snapshot (default: channel 1)"
    echo "  record [channel] [seconds]      Record a video clip (default: 10s)"
    echo "  motion on|off [channel]         Enable/disable motion detection"
    echo "  info                            Get DVR device info"
    ;;
esac
