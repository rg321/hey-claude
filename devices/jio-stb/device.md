### Jio Set Top Box (Skyworth JHSB200)
- Protocol: DLNA (port 2870) + DIAL (port 52235)
- STB config (IP, MAC) is in config.json under `stb`
- IP may change (DHCP) — check config or scan by MAC

#### DLNA Control (cast media, volume)
- Cast media: `bash devices/jio-stb/cast.sh <url> [title]`
- Stop playback: `bash devices/jio-stb/cast.sh stop`
- Volume: `bash devices/jio-stb/cast.sh volume <0-100>`
- Mute/unmute: `bash devices/jio-stb/cast.sh mute` / `bash devices/jio-stb/cast.sh unmute`
- Cast CCTV: `bash devices/jio-stb/cast.sh cctv [channel]`

#### DIAL (launch apps)
- Launch YouTube: `bash devices/jio-stb/dial.sh youtube [videoId]`
- Launch Netflix: `bash devices/jio-stb/dial.sh netflix`
- Stop app: `bash devices/jio-stb/dial.sh stop <appName>`

#### Notes
- HLS casting requires DIDL-Lite metadata (handled by cast.sh)
- DLNA Play returns 501 error but **actually works** — ignore the error
- DIAL POST may return 403 after stopping an app — STB restart may be needed
- No power on/off control available (no WoL, no WebSocket)
