# Jimmy Pet bridge

Makes the desktop pet mirror **Jimmy's** live activity (not this machine's local
agents). It reads Jimmy's activity feed from the OpenClaw gateway over the
tailnet and pushes state into the pet's built-in WebSocket server.

```
gateway (tools/jimmy-pet)  --SSE-->  jimmy-bridge.mjs  --ws://127.0.0.1:8765-->  Jimmy Pet.app
   http://100.90.13.9:8778/events        (Daniel's Mac)            (codex-pet-v1)
```

Why a bridge instead of the app's built-in "OpenClaw" source: that source tails
local session `.jsonl` files, but Jimmy's session lives on the gateway host, not
on Daniel's Mac. The gateway already publishes Jimmy's computed state over the
tailnet, so the bridge just relays it. No changes to the Rust app required.

## State mapping

| Jimmy feed state | pet message_type | animation |
|------------------|------------------|-----------|
| coding / writing / researching / reading / thinking / delegating | `processing` | running |
| messaging | `new_message` | waving |
| idle | `idle` | idle |

## Install (on Daniel's Mac, after building the app)

```bash
bash bridge/install.sh
```

Requires Node >= 21 (uses global `fetch` + `WebSocket`; no npm deps). Installs a
launchd agent `ai.openclaw.jimmy-pet-bridge` that runs at login and restarts on
crash. Logs: `~/Library/Logs/openclaw/jimmy-pet-bridge.log`.

## Run manually (to test)

```bash
node bridge/jimmy-bridge.mjs
```

Override endpoints with env vars if needed:

```bash
JIMMY_FEED_URL=http://100.90.13.9:8778/events JIMMY_PET_WS=ws://127.0.0.1:8765 \
  node bridge/jimmy-bridge.mjs
```

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/ai.openclaw.jimmy-pet-bridge.plist
rm ~/Library/LaunchAgents/ai.openclaw.jimmy-pet-bridge.plist
```
