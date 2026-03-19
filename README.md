# hey-claude

**When Alexa can't answer, Claude takes over.**

A lightweight AI home assistant that catches failed Alexa commands, routes them to Claude, and executes them — controlling your TV, speakers, cameras, and more.

![Architecture](architecture.png)

## How it works

1. You speak a command to Alexa
2. Alexa can't handle it ("Sorry, I don't know that")
3. A **poller** watches Alexa's voice history every 2s and catches the failure
4. A **watcher** (100ms polling) detects the new command and spawns a **Claude Haiku** session
5. Claude understands the intent, executes the action (TV on/off, launch apps, play music, etc.)
6. The response is spoken back through Alexa in a male voice (Matthew via SSML)

While Claude is processing, you hear a beep sound so you know it's working.

## Architecture

- **Poller** (`poller.js`) — Connects to Alexa via `alexa-remote2`, pulls voice history, filters failed commands
- **Watcher** (`watch.sh`) — Detects new failed commands, handles deduplication, spawns Claude sessions
- **Claude sessions** — One Haiku session per command, reads `CLAUDE.md` for context, executes via bash
- **LG TV control** (`lg_tv.js`) — Direct WebSocket (SSAP) control: power, volume, apps, screenshots
- **Alexa control** (`alexa_control/`) — Speak, volume, text commands, announcements

## Supported devices

| Device | Protocol | What it can do |
|--------|----------|----------------|
| **LG WebOS TV** | WebSocket (SSAP) | Power on/off, volume, launch apps (YouTube, Netflix, Spotify), screenshots |
| **Alexa Echo Dot** | alexa-remote2 | Speak, play music, text commands, announcements |
| **CP Plus DVR** | HTTP + RTSP | Snapshots, stream to TV, motion detection |
| **Smart Lights** | — | Planned |

## Setup

### Prerequisites

- Node.js 18+
- An Amazon Echo device
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Devices on the same local network

### 1. Clone and install

```bash
git clone https://github.com/rg321/hey-claude.git
cd hey-claude
npm install
cd alexa_control && npm install && cd ..
```

### 2. Authenticate with Alexa

```bash
cd alexa_control
node auth.js
# Opens a browser — log in with your Amazon account
# Saves cookie_data.json (gitignored)
```

### 3. Configure devices

```bash
cp config.example.json config.json
```

Edit `config.json` with your device IPs, MAC addresses, and network details. This file is gitignored.

### 4. Configure CLAUDE.md

```bash
cp CLAUDE.md.example CLAUDE.md
```

Edit `CLAUDE.md` with your device details, Alexa device name, and user preferences. This is read by every Claude session — it's the persistent knowledge base.

### 5. Pair LG TV (if applicable)

On first run, the TV will show a pairing prompt — accept it. The client key is saved automatically.

### 6. Start

```bash
# Start the poller (watches Alexa voice history)
nohup node poller.js > poller.log 2>&1 &

# Start the watcher (spawns Claude sessions for failed commands)
nohup bash watch.sh > /dev/null 2>&1 &
```

Now speak to Alexa. If she can't handle it, Claude will.

## File structure

```
├── poller.js             # Polls Alexa voice history, filters failures
├── watch.sh              # Watches for new commands, spawns Claude sessions
├── lg_tv.js              # LG WebOS TV control via SSAP WebSocket
├── config.json           # Your device IPs, MACs, network (gitignored)
├── config.example.json   # Template config
├── CLAUDE.md             # Persistent knowledge for Claude (gitignored)
├── CLAUDE.md.example     # Template knowledge base
├── STATE.md              # Ephemeral device state (gitignored)
├── alexa_control/
│   ├── auth.js           # Alexa authentication (generates cookie_data.json)
│   ├── control.js        # Alexa commands (speak, volume, textcommand)
│   └── ...
```

## Key design decisions

- **One Claude session per command** — Fast, cheap (Haiku), no long-running process
- **CLAUDE.md as memory** — Claude reads it every session, learns across sessions by writing back to it
- **STATE.md for ephemeral state** — Device power/volume/app tracked separately from persistent knowledge
- **Failure blacklist in poller** — Only routes genuinely failed commands to Claude; successful Alexa responses are skipped
- **60s dedup window** — Prevents feedback loops when Claude's actions trigger new Alexa events
- **Dynamic response delay** — Waits for Alexa to finish speaking (~20 chars/sec) before Claude responds
- **Processing beeps** — Audio feedback while Claude is working so you know it's alive

## Adding new devices

1. Create a control script (like `lg_tv.js`)
2. Add the device details to your `CLAUDE.md` — commands, IP, protocol
3. Claude will automatically use it for relevant commands

## Contributing

Contributions are welcome! Feel free to open issues or submit PRs — whether it's adding support for new devices, improving the failure detection, or making the pipeline faster.

## License

MIT
