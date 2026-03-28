#!/bin/bash
# Watches failed_alexa_conversations.jsonl for new commands
# Spawns a claude session per command for intelligent processing
# Auto-includes device docs from devices/*/device.md

ROOT_DIR="$HOME/ai/home_assistant"
FAILED_FILE="$ROOT_DIR/failed_alexa_conversations.jsonl"
ALL_FILE="$ROOT_DIR/all_alexa_conversations.jsonl"
LOG_FILE="$ROOT_DIR/watch.log"
LAST_COUNT_FILE="$ROOT_DIR/.last_line_count"
RECENT_CMDS_FILE="$ROOT_DIR/.recent_commands"
ALEXA_DIR="$ROOT_DIR/core/alexa"
MUSIC_STATE_FILE="$ROOT_DIR/.music_playing"
DEDUP_WINDOW=60  # seconds — ignore duplicate commands within this window

# Initialize last count
if [ ! -f "$LAST_COUNT_FILE" ]; then
  wc -l < "$FAILED_FILE" | tr -d ' ' > "$LAST_COUNT_FILE"
  echo "[$(date)] Initialized line count to $(cat "$LAST_COUNT_FILE")" >> "$LOG_FILE"
fi

echo "[$(date)] Watcher started (100ms polling)" >> "$LOG_FILE"

while true; do
  CURRENT_COUNT=$(wc -l < "$FAILED_FILE" 2>/dev/null | tr -d ' ')
  LAST_COUNT=$(cat "$LAST_COUNT_FILE" 2>/dev/null || echo 0)

  if [ "$CURRENT_COUNT" -gt "$LAST_COUNT" ]; then
    NEW_LINES=$((CURRENT_COUNT - LAST_COUNT))
    echo "[$(date)] $NEW_LINES new command(s) detected" >> "$LOG_FILE"

    tail -n "$NEW_LINES" "$FAILED_FILE" | while IFS= read -r line; do
      [ -z "$line" ] && continue

      COMMAND=$(echo "$line" | jq -r '.command' 2>/dev/null)
      TIMESTAMP=$(echo "$line" | jq -r '.timestamp' 2>/dev/null)
      ALEXA_RESP=$(echo "$line" | jq -r '.alexaResponse // ""' 2>/dev/null)
      [ -z "$COMMAND" ] || [ "$COMMAND" = "null" ] && continue

      # Skip junk commands (transcription artifacts like commas, single chars)
      CLEAN=$(echo "$COMMAND" | tr -d '[:space:][:punct:]')
      if [ ${#CLEAN} -lt 2 ]; then
        echo "[$(date)] SKIPPED (junk): $COMMAND" >> "$LOG_FILE"
        continue
      fi

      # Deduplicate: skip if same command was processed within DEDUP_WINDOW seconds
      NOW=$(date +%s)
      LAST_RUN=$(grep -F "$COMMAND" "$RECENT_CMDS_FILE" 2>/dev/null | tail -1 | cut -d'|' -f1)
      if [ -n "$LAST_RUN" ] && [ $((NOW - LAST_RUN)) -lt "$DEDUP_WINDOW" ]; then
        echo "[$(date)] SKIPPED (duplicate within ${DEDUP_WINDOW}s): $COMMAND" >> "$LOG_FILE"
        continue
      fi
      # Record this command with timestamp
      echo "${NOW}|${COMMAND}" >> "$RECENT_CMDS_FILE"
      # Prune old entries (keep last 50)
      tail -50 "$RECENT_CMDS_FILE" > "$RECENT_CMDS_FILE.tmp" && mv "$RECENT_CMDS_FILE.tmp" "$RECENT_CMDS_FILE"

      echo "[$(date)] Processing: $COMMAND" >> "$LOG_FILE"

      # Wait for Alexa to finish speaking her failure response (~20 chars/sec)
      if [ -n "$ALEXA_RESP" ] && [ "$ALEXA_RESP" != "" ]; then
        RESP_LEN=${#ALEXA_RESP}
        WAIT_SECS=$(( RESP_LEN / 25 ))
        echo "[$(date)] Waiting ${WAIT_SECS}s for Alexa to finish (${RESP_LEN} chars)" >> "$LOG_FILE"
        sleep "$WAIT_SECS"
      fi

      # Check if music is playing — don't interrupt it
      MUSIC_PLAYING=false
      if [ -f "$MUSIC_STATE_FILE" ]; then
        MUSIC_PLAYING=true
        echo "[$(date)] Music playing — skipping acknowledgment and beeps" >> "$LOG_FILE"
      fi

      # Acknowledgment via Alexa (always — so user knows it was picked up)
      cd "$ALEXA_DIR" && node control.js speak '<voice name="Matthew">Let me give it a shot</voice>' >> "$LOG_FILE" 2>&1

      # Get recent conversation context (last 5 lines from all conversations)
      RECENT=$(tail -5 "$ALL_FILE" 2>/dev/null | jq -r '.command' 2>/dev/null | tr '\n' ', ')

      # Auto-assemble device docs from devices/*/device.md
      DEVICE_DOCS=$(cat "$ROOT_DIR"/devices/*/device.md 2>/dev/null)

      # Build the prompt for claude
      RESPONSE_FILE="/tmp/alexa_response_$$.txt"
      PROMPT="You are processing a voice command from Alexa in real-time.

## Available Devices
$DEVICE_DOCS

## Alexa (voice interface)
- Speak: cd $ALEXA_DIR && node control.js speak \"text\"
- Text command: cd $ALEXA_DIR && node control.js textcommand \"query\"
- Volume: cd $ALEXA_DIR && node control.js volume 0-100
- Stop: cd $ALEXA_DIR && node control.js stop

Recent commands for context: $RECENT

New command to execute: \"$COMMAND\"
Raw JSON: $line

Execute this command now. After executing:
- Update STATE.md with any device state changes (power, volume, app, etc.)
- Update CLAUDE.md if you learned something new (user preferences, aliases, device tips) — add it to the appropriate section.
- Do NOT speak via Alexa yourself. Instead write ONLY the short response text (no SSML, no quotes) to $RESPONSE_FILE"

      # Spawn claude in background, beep while processing
      cd "$ROOT_DIR" && claude -p "$PROMPT" --model haiku --dangerously-skip-permissions >> "$LOG_FILE" 2>&1 &
      CLAUDE_PID=$!

      # Beep in background (skip if music is playing)
      BEEP_PID=""
      if ! $MUSIC_PLAYING; then
        (
          while true; do
            sleep 0.3
            cd "$ALEXA_DIR" && node control.js speak '<audio src="soundbank://soundlibrary/computers/beeps_tones/beeps_tones_08"/>' > /dev/null 2>&1 && echo "[$(date)] beep" >> "$LOG_FILE"
          done
        ) &
        BEEP_PID=$!
      fi
      wait "$CLAUDE_PID"

      # Kill beep loop if it was started
      if [ -n "$BEEP_PID" ]; then
        pkill -P "$BEEP_PID" 2>/dev/null
        kill "$BEEP_PID" 2>/dev/null
        wait "$BEEP_PID" 2>/dev/null
        cd "$ALEXA_DIR" && node control.js stop > /dev/null 2>&1
      fi

      # If music was playing, clear the flag (Claude's action likely interrupted it)
      if $MUSIC_PLAYING; then
        rm -f "$MUSIC_STATE_FILE"
      fi

      # Speak response
      if [ -f "$RESPONSE_FILE" ]; then
        RESPONSE=$(cat "$RESPONSE_FILE")
        rm -f "$RESPONSE_FILE"
      else
        RESPONSE="Done"
      fi
      # speak ≤220 chars, announce 221-350, truncate+announce >350
      RESP_LEN=${#RESPONSE}
      if [ "$RESP_LEN" -gt 350 ]; then
        RESPONSE=$(echo "$RESPONSE" | cut -c1-350)
      fi
      if [ "$RESP_LEN" -gt 220 ]; then
        cd "$ALEXA_DIR" && node control.js announce "$RESPONSE" >> "$LOG_FILE" 2>&1
      else
        cd "$ALEXA_DIR" && node control.js speak "<voice name=\"Matthew\">$RESPONSE</voice>" >> "$LOG_FILE" 2>&1
      fi

      echo "[$(date)] Finished: $COMMAND" >> "$LOG_FILE"
    done

    # Update last count
    echo "$CURRENT_COUNT" > "$LAST_COUNT_FILE"
  fi

  sleep 0.1
done
