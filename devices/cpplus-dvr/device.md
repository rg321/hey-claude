### CP Plus DVR (CCTV)
- Control: `bash devices/cpplus-dvr/stream.sh <cmd>`
- Commands:
  - `bash devices/cpplus-dvr/stream.sh cast` — CCTV on LG TV (mom's TV / default TV)
  - `bash devices/cpplus-dvr/stream.sh cast 2` — Cast channel 2 to LG TV
  - `bash devices/cpplus-dvr/stream.sh stop` — Stop stream + kill HTTP server
  - `bash devices/cpplus-dvr/stream.sh status` — Check if stream is running
- **CCTV on dad's TV (Jio STB)**: use `bash devices/jio-stb/cast.sh cctv` instead
- Auto-discovers DVR IP by MAC address (handles DHCP changes after power restarts)
- Default: main stream (1080p), use 3rd arg `1` for sub-stream (352x288)
- Auto-stops 30 min after TV switches away from browser
- DVR config (IP, MAC, credentials) is in config.json under `dvr`

#### CCTV Routing — IMPORTANT
- "cctv on tv" / "cctv on my tv" / "cctv on mom's tv" → `bash devices/cpplus-dvr/stream.sh cast`
- "cctv on dad's tv" / "cctv on papa's tv" → `bash devices/jio-stb/cast.sh cctv`
- "stop cctv" / "stop camera" → `bash devices/cpplus-dvr/stream.sh stop`
- When casting to dad's TV, do NOT also call `stream.sh cast` — that opens on LG TV (mom's TV). Only call `cast.sh cctv` which handles ffmpeg + DLNA internally.
