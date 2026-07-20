# Jimmy Pet — build status

Fork of `xiangking/agent-pet` (Tauri v2 + Rust + React) customized to be a
transparent, free-floating macOS sprite overlay that mirrors **Jimmy's** live
activity in real time.

## What's done (on the gateway, committed to branch `jimmy-pet`)

- **Jimmy pet added** — `pets/jimmy/` (white-dog codex sprite, 1536×1872, exact
  8×9 @ 192×208 atlas match). Set as the default pet on first launch
  (`src/App.jsx` → `loadInitialPet`).
- **Branded** — `productName: "Jimmy Pet"`, identifier `ai.openclaw.jimmypet`
  (`src-tauri/tauri.conf.json`). Window is already transparent, borderless,
  always-on-top, no shadow, skips the taskbar — a true floating overlay.
- **Activity bridge** — `bridge/jimmy-bridge.mjs` + `bridge/install.sh`. Relays
  Jimmy's live state from the gateway feed into the pet's WebSocket server. See
  `bridge/README.md`. Pure Node, no npm deps.
- **Frontend build verified** on the gateway (`npm install && npm run build` —
  vite/JS side compiles clean). See "Verification" below.

## What has to happen on Daniel's Mac (Apple Silicon)

The gateway host is Intel x64 and has **no Rust toolchain**, so the native `.app`
cannot be cross-built there. On the Mac:

### 1. Prereqs (one time)
```bash
xcode-select --install                 # if not already
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust
# Node >= 21 (for both the build and the bridge) — e.g. `brew install node`
```

### 2. Build the app
```bash
cd agent-pet
npm install
npm run tauri build            # produces src-tauri/target/release/bundle/macos/Jimmy Pet.app
```
Open it: `open "src-tauri/target/release/bundle/macos/Jimmy Pet.app"`
(unsigned — first launch: right-click → Open, or `xattr -dr com.apple.quarantine` the .app).

### 3. Start the activity bridge
```bash
bash bridge/install.sh         # launchd agent, runs at login, auto-restarts
tail -f ~/Library/Logs/openclaw/jimmy-pet-bridge.log
```

You should see the dog switch to the running animation while Jimmy works and
settle to idle when he's done.

## Notes / follow-ups
- **Bubbles (speech text):** v1 mirrors *animation* state only. The pet's WS
  path ignores payload text (only the local file-monitor path renders bubbles).
  A v2 could add Jimmy's `task` string as a bubble via a small Rust tweak or by
  routing through a synced session file. Not blocking.
- **Built-in pets** resolve from the repo's `pets/` dir at the build machine
  path; keep the cloned repo in place after building.
- Gateway feed: `http://100.90.13.9:8778` (launchd `ai.openclaw.jimmy-pet`,
  states: coding/researching/reading/writing/thinking/delegating/messaging/idle).
