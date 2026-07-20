#!/usr/bin/env bash
# Installs the Jimmy Pet bridge as a launchd agent on Daniel's Mac.
# Resolves the local node path at install time so launchd's minimal PATH
# doesn't break it (a bug that has bitten OpenClaw launchd jobs before).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/jimmy-bridge.mjs"
LABEL="ai.openclaw.jimmy-pet-bridge"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/openclaw"
mkdir -p "$LOG_DIR" "$(dirname "$PLIST")"

NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "ERROR: node not found in PATH. Install Node >= 21 first." >&2
  exit 1
fi
NODE_MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 21 ]; then
  echo "ERROR: node $($NODE -v) too old; need >= 21 (global fetch + WebSocket)." >&2
  exit 1
fi

echo "node:   $NODE ($($NODE -v))"
echo "script: $SCRIPT"
echo "plist:  $PLIST"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$SCRIPT</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/jimmy-pet-bridge.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/jimmy-pet-bridge.log</string>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "loaded. tail logs with:  tail -f $LOG_DIR/jimmy-pet-bridge.log"
