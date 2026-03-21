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

#### Notes
- Auto-discovers DVR IP by MAC address (handles DHCP changes)
- Default: main stream (1080p)
- DVR config in config.json under `dvr`
