### Jio Set Top Box (Skyworth JHSB200) — "dad's TV" / "papa ka TV"
- Protocol: DLNA (port 2870) + DIAL (port 52235)
- STB config (IP, MAC) is in config.json under `stb`
- IP may change (DHCP) — check config or scan by MAC

#### CCTV on this TV
- `bash devices/jio-stb/cast.sh cctv` — Cast CCTV camera to this STB (fullscreen via DLNA)
- `bash devices/jio-stb/cast.sh cctv 2` — Cast channel 2
- This is the correct command when user says "cctv on dad's tv" — do NOT use dial.sh or YouTube for CCTV

#### DLNA Control (cast media, volume)
- Cast any URL: `bash devices/jio-stb/cast.sh <url> [title]`
- Stop playback: `bash devices/jio-stb/cast.sh stop`
- Volume: `bash devices/jio-stb/cast.sh volume <0-100>`
- Mute/unmute: `bash devices/jio-stb/cast.sh mute` / `bash devices/jio-stb/cast.sh unmute`

#### DIAL (launch apps — YouTube, Netflix only)
- Launch YouTube: `bash devices/jio-stb/dial.sh youtube [videoId]`
- Launch Netflix: `bash devices/jio-stb/dial.sh netflix`
- Stop app: `bash devices/jio-stb/dial.sh stop <appName>`
- Only use DIAL for YouTube/Netflix app launch, NOT for CCTV

#### Notes
- DLNA Play returns 501 error but **actually works** — ignore the error
- DIAL POST may return 403 after stopping an app — STB restart may be needed
- No power on/off control available (no WoL, no WebSocket)
