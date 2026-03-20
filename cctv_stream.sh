#!/bin/bash
# CCTV Stream — transcodes DVR RTSP to HLS and casts to LG TV browser
# Usage: cctv_stream.sh start|stop|status|cast [channel]

set -e

HOME_DIR="$HOME/ai/home_assistant"
CONFIG="$HOME_DIR/config.json"
STATE="$HOME_DIR/STATE.md"
LOG="$HOME_DIR/cctv_stream.log"
PID_FILE="/tmp/cctv_stream.pid"
HTTP_PID_FILE="/tmp/cctv_http.pid"
WATCHDOG_PID_FILE="/tmp/cctv_watchdog.pid"
HLS_DIR="/tmp/cctv_hls"

# Read config
DVR_IP_CONFIG=$(jq -r '.dvr.ip' "$CONFIG")
DVR_MAC=$(jq -r '.dvr.mac // ""' "$CONFIG")
DVR_USER=$(jq -r '.dvr.user' "$CONFIG")
DVR_PASS=$(jq -r '.dvr.pass' "$CONFIG")
TV_IP=$(jq -r '.tv.ip' "$CONFIG")
LAPTOP_IP=$(jq -r '.network.laptop' "$CONFIG")
HTTP_PORT=8899
GRACE_PERIOD=1800  # 30 minutes in seconds

# Discover DVR IP by MAC address (handles DHCP changes after power restart)
discover_dvr() {
  if [ -n "$DVR_MAC" ]; then
    # Ping broadcast to populate ARP table
    ping -c 1 -t 1 "$(jq -r '.tv.broadcast' "$CONFIG")" > /dev/null 2>&1 || true
    # Look up MAC in ARP table
    FOUND_IP=$(arp -a 2>/dev/null | grep -i "$DVR_MAC" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
    if [ -n "$FOUND_IP" ]; then
      DVR_IP="$FOUND_IP"
      # Update config if IP changed
      if [ "$FOUND_IP" != "$DVR_IP_CONFIG" ]; then
        log "DVR IP changed: $DVR_IP_CONFIG → $FOUND_IP (updating config.json)"
        jq --arg ip "$FOUND_IP" '.dvr.ip = $ip' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
      fi
      return 0
    fi
  fi
  # Fallback: try config IP
  DVR_IP="$DVR_IP_CONFIG"
  if nc -z -w 2 "$DVR_IP" 554 2>/dev/null; then
    return 0
  fi
  # Last resort: scan subnet for RTSP
  log "DVR not found by MAC or config IP, scanning subnet..."
  for i in $(seq 1 254); do
    IP="192.168.29.$i"
    if nc -z -w 1 "$IP" 554 2>/dev/null; then
      DVR_IP="$IP"
      log "DVR found at $IP via subnet scan"
      jq --arg ip "$IP" '.dvr.ip = $ip' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
      return 0
    fi
  done
  return 1
}

CMD="${1:-status}"
CHANNEL="${2:-1}"
SUBTYPE="${3:-0}"  # 0=main stream (1080p, default), 1=sub stream (352x288)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

is_http_running() {
  [ -f "$HTTP_PID_FILE" ] && kill -0 "$(cat "$HTTP_PID_FILE")" 2>/dev/null
}

start_stream() {
  if is_running; then
    echo "Stream already running (PID $(cat "$PID_FILE"))"
    return 0
  fi

  # Discover DVR IP (handles DHCP changes)
  if ! discover_dvr; then
    echo "Error: DVR not found on network"
    return 1
  fi
  log "Using DVR at $DVR_IP"

  # Verify RTSP reachable
  if ! nc -z -w 2 "$DVR_IP" 554 2>/dev/null; then
    echo "Error: DVR not reachable at $DVR_IP:554"
    return 1
  fi

  # Prepare HLS directory
  rm -rf "$HLS_DIR"
  mkdir -p "$HLS_DIR"
  # Copy fullscreen player HTML
  cp "$HOME_DIR/cctv_player.html" "$HLS_DIR/index.html"

  RTSP_URL="rtsp://${DVR_USER}:${DVR_PASS}@${DVR_IP}:554/cam/realmonitor?channel=${CHANNEL}&subtype=${SUBTYPE}"

  # Start ffmpeg — copy H.264 stream to HLS (no re-encoding)
  ffmpeg -rtsp_transport tcp -i "$RTSP_URL" \
    -c:v copy -an \
    -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments+append_list \
    "$HLS_DIR/stream.m3u8" \
    > "$LOG.ffmpeg" 2>&1 &
  echo $! > "$PID_FILE"
  log "ffmpeg started (PID $!, channel $CHANNEL, subtype $SUBTYPE)"

  # Start HTTP server
  if ! is_http_running; then
    cd "$HLS_DIR" && python3 -m http.server "$HTTP_PORT" --bind 0.0.0.0 > /dev/null 2>&1 &
    echo $! > "$HTTP_PID_FILE"
    log "HTTP server started on port $HTTP_PORT (PID $!)"
  fi

  # Wait for first HLS segment
  for i in $(seq 1 10); do
    if [ -f "$HLS_DIR/stream.m3u8" ]; then
      echo "Stream ready at http://${LAPTOP_IP}:${HTTP_PORT}/stream.m3u8"
      return 0
    fi
    sleep 1
  done

  echo "Warning: stream started but HLS not ready yet"
}

stop_stream() {
  local stopped=false

  # Kill watchdog
  if [ -f "$WATCHDOG_PID_FILE" ]; then
    kill "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null
    rm -f "$WATCHDOG_PID_FILE"
  fi

  # Kill ffmpeg
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null
    rm -f "$PID_FILE"
    stopped=true
  fi

  # Kill HTTP server
  if [ -f "$HTTP_PID_FILE" ]; then
    kill "$(cat "$HTTP_PID_FILE")" 2>/dev/null
    rm -f "$HTTP_PID_FILE"
  fi
  # Kill any orphan process on the HTTP port
  lsof -ti :"$HTTP_PORT" 2>/dev/null | xargs kill 2>/dev/null || true

  # Cleanup
  rm -rf "$HLS_DIR"

  if $stopped; then
    log "Stream stopped"
    echo "Stream stopped"
  else
    echo "Stream was not running"
  fi
}

stream_status() {
  if is_running; then
    echo "Stream: running (PID $(cat "$PID_FILE"))"
    is_http_running && echo "HTTP: running on port $HTTP_PORT" || echo "HTTP: not running"
    [ -f "$WATCHDOG_PID_FILE" ] && echo "Watchdog: active" || echo "Watchdog: inactive"
  else
    echo "Stream: not running"
  fi
}

start_watchdog() {
  # Kill existing watchdog
  [ -f "$WATCHDOG_PID_FILE" ] && kill "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null

  (
    AWAY_SINCE=""

    while true; do
      sleep 30

      # Check if stream is still running
      if ! is_running; then
        log "Watchdog: stream stopped externally, exiting"
        break
      fi

      # Check TV status
      TV_STATUS=$(cd "$HOME_DIR" && node lg_tv.js status 2>/dev/null || echo '{"app":"unknown"}')
      CURRENT_APP=$(echo "$TV_STATUS" | jq -r '.app // "unknown"' 2>/dev/null)

      if [ "$CURRENT_APP" = "com.webos.app.browser" ]; then
        # Still on browser — reset grace timer
        if [ -n "$AWAY_SINCE" ]; then
          log "Watchdog: TV back on browser, cancelling grace period"
          AWAY_SINCE=""
        fi
      else
        # TV switched away or off
        if [ -z "$AWAY_SINCE" ]; then
          # First detection — start grace period
          AWAY_SINCE=$(date +%s)
          log "Watchdog: TV switched to $CURRENT_APP, starting ${GRACE_PERIOD}s grace period"
          # Notify user
          cd "$HOME_DIR/alexa_control" && node control.js speak '<voice name="Matthew">Camera stream is still running. Say stop camera to end it.</voice>' > /dev/null 2>&1
        else
          # Check if grace period expired
          NOW=$(date +%s)
          ELAPSED=$((NOW - AWAY_SINCE))
          if [ "$ELAPSED" -ge "$GRACE_PERIOD" ]; then
            log "Watchdog: grace period expired (${ELAPSED}s), stopping stream"
            stop_stream
            cd "$HOME_DIR/alexa_control" && node control.js speak '<voice name="Matthew">Camera stream stopped after 30 minutes of inactivity.</voice>' > /dev/null 2>&1
            break
          fi
        fi
      fi
    done
  ) &
  echo $! > "$WATCHDOG_PID_FILE"
  log "Watchdog started (PID $!)"
}

cast_to_tv() {
  # Check TV is on
  TV_STATUS=$(cd "$HOME_DIR" && node lg_tv.js status 2>&1) || true
  if echo "$TV_STATUS" | grep -qi "error\|timeout"; then
    # Try to turn on TV
    cd "$HOME_DIR" && node lg_tv.js on
    echo "Sent WoL to TV, waiting 8s for boot..."
    sleep 8
  fi

  # Start stream if not running
  start_stream

  # Wait a moment for segments to build up
  sleep 3

  # Open fullscreen player on TV
  HLS_URL="http://${LAPTOP_IP}:${HTTP_PORT}/index.html"
  cd "$HOME_DIR" && node -e "
    const fs = require('fs');
    const path = require('path');
    const config = JSON.parse(fs.readFileSync(path.join('$HOME_DIR', 'config.json'), 'utf8'));
    // Reuse lg_tv.js connection logic
    process.argv = ['node', 'lg_tv.js', 'browser', '$HLS_URL'];
  " 2>/dev/null || true

  # Use lg_tv.js directly — open URL in browser
  # lg_tv.js doesn't have a browser command yet, use the SSAP directly
  cd "$HOME_DIR" && node -e "
    const WebSocket = require('ws');
    const fs = require('fs');
    const path = require('path');
    const config = JSON.parse(fs.readFileSync(path.join('$HOME_DIR', 'config.json'), 'utf8'));
    const TV_IP = config.tv.ip;
    const ws = new WebSocket('wss://' + TV_IP + ':3001', { rejectUnauthorized: false });
    let msgId = 0;
    const clientKey = fs.readFileSync(path.join('$HOME_DIR', 'lg_tv_client_key.txt'), 'utf8').trim();
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'register', id: 'reg_' + (++msgId),
        payload: { 'client-key': clientKey, pairingType: 'PROMPT' }
      }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'registered') {
        ws.send(JSON.stringify({
          type: 'request', id: 'open_' + (++msgId),
          uri: 'ssap://system.launcher/open',
          payload: { target: '$HLS_URL' }
        }));
        setTimeout(() => { ws.close(); process.exit(0); }, 2000);
      }
    });
    ws.on('error', (e) => { console.error(e.message); process.exit(1); });
    setTimeout(() => process.exit(1), 10000);
  " 2>&1

  log "Cast to TV: $HLS_URL"
  echo "Camera feed cast to TV"

  # Start watchdog
  start_watchdog
}

case "$CMD" in
  start)  start_stream ;;
  stop)   stop_stream ;;
  status) stream_status ;;
  cast)   cast_to_tv ;;
  *)      echo "Usage: cctv_stream.sh start|stop|status|cast [channel] [subtype]" ;;
esac
