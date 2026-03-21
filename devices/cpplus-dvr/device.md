### CP Plus DVR (CCTV)
Shows live camera feed on a TV.

#### Which TV?
- **Mom's TV / my TV / just "TV"** → `bash devices/cpplus-dvr/stream.sh cast`
- **Dad's TV / papa ka TV** → `bash devices/jio-stb/cast.sh cctv`
- NEVER call both. Pick ONE based on which TV the user means.

#### Other commands
- `bash devices/cpplus-dvr/stream.sh cast 2` — Channel 2 on mom's TV
- `bash devices/jio-stb/cast.sh cctv 2` — Channel 2 on dad's TV
- `bash devices/cpplus-dvr/stream.sh stop` — Stop the stream
- `bash devices/cpplus-dvr/stream.sh status` — Check if running

#### DVR direct control
- `bash devices/cpplus-dvr/dvr.sh snapshot` — Take a photo from camera 1
- `bash devices/cpplus-dvr/dvr.sh snapshot 2` — Photo from camera 2
- `bash devices/cpplus-dvr/dvr.sh record` — Record 10s clip from camera 1
- `bash devices/cpplus-dvr/dvr.sh record 1 30` — Record 30s clip
- `bash devices/cpplus-dvr/dvr.sh motion on` — Enable motion detection
- `bash devices/cpplus-dvr/dvr.sh motion off` — Disable motion detection
- `bash devices/cpplus-dvr/dvr.sh info` — DVR model, serial, firmware

#### Notes
- Auto-discovers DVR IP by MAC address (handles DHCP changes)
- Default: main stream (1080p)
- DVR config in config.json under `dvr`
