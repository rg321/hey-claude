# Backlog

Open features and improvements. PRs welcome!

## Response Delivery
- [ ] **Chunked long responses** — Split responses >350 chars into ~220-char chunks, send each via `speak` sequentially for seamless delivery without the announcement chime
- [ ] **Stream responses** — Instead of waiting for Claude to finish, stream partial responses to Alexa as they're generated

## Voice & UX
- [ ] **Persistent Alexa connection** — Keep a long-running process with a persistent connection to Alexa API instead of cold-starting `node control.js` for every speak/beep (~2-3s overhead per call)
- [ ] **Customizable voice** — Make the SSML voice (currently Matthew) configurable via config.json
- [ ] **Punjabi/Hindi TTS** — Support regional language responses (currently English only, even for Hindi/Punjabi commands)
- [ ] **Smarter processing sound** — Replace beep loop with a single looping audio clip to avoid the per-beep API call overhead

## Device Support
- [ ] **Smart lights** — Integrate Philips Hue, LIFX, Tuya, or other smart bulbs
- [ ] **Smart plugs** — Control power outlets (fans, appliances)
- [ ] **Air conditioner** — IR blaster or smart AC integration
- [ ] **Robot vacuum** — Start/stop cleaning via voice
- [ ] **Multiple TVs** — Support more than one TV, route commands by room/name

## Intelligence
- [ ] **Conversation context** — Pass more than 5 recent commands for better context understanding
- [ ] **Multi-step commands** — Handle "turn on TV, open YouTube, and play lofi music" as a single flow
- [ ] **Scheduled commands** — "Turn off TV in 30 minutes", "Play bhajans at 6am every day"
- [ ] **Learning from corrections** — If user says "no, I meant the bedroom TV", learn the preference

## Architecture
- [ ] **Local LLM support** — Use Ollama with models like qwen3-coder for zero API cost
- [ ] **Faster polling** — Replace 2s Alexa history polling with a push-based approach (WebSocket/MQTT from Alexa)
- [ ] **Web dashboard** — Simple UI showing command history, device states, and logs
- [ ] **Failure detection improvements** — Better heuristics for detecting Alexa failures vs. successful responses

## Developer Experience
- [ ] **Docker setup** — One-command deployment with Docker Compose
- [ ] **Test suite** — Unit tests for poller failure detection, dedup logic, response routing
- [ ] **Plugin system** — Standard interface for adding new devices without modifying core code
