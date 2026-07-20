#!/usr/bin/env node
// Jimmy Pet bridge
// -----------------
// Reads Jimmy's live activity feed (Server-Sent Events from the OpenClaw
// gateway) and drives the Jimmy Pet desktop overlay by pushing messages to its
// built-in WebSocket server (codex-pet-v1 protocol).
//
// Runs on Daniel's Mac. Requires Node >= 21 (uses global fetch + WebSocket).
//
// Env overrides:
//   JIMMY_FEED_URL  default http://100.90.13.9:8778/events   (gateway, over tailnet)
//   JIMMY_PET_WS    default ws://127.0.0.1:8765               (local pet server)

const FEED_URL = process.env.JIMMY_FEED_URL || "http://100.90.13.9:8778/events";
const PET_WS = process.env.JIMMY_PET_WS || "ws://127.0.0.1:8765";

// Jimmy feed state -> agent-pet message_type (see src-tauri/src/message.rs).
// The pet maps message_type -> animation via its message map:
//   processing->running, new_message->waving, waiting_input->waiting,
//   review_required->review, error->failed, idle->idle
const STATE_MAP = {
  coding: "processing",
  writing: "processing",
  researching: "processing",
  reading: "processing",
  thinking: "processing",
  delegating: "processing",
  messaging: "new_message",
  idle: "idle",
};

let ws = null;
let wsReady = false;
let lastSent = null;
let pendingState = "idle";
let pendingTask = "";

const log = (...a) => console.log(new Date().toISOString(), ...a);

function connectPetWs() {
  let sock;
  try {
    sock = new WebSocket(PET_WS);
  } catch (e) {
    log("pet ws construct failed:", e.message, "- retry 3s");
    return void setTimeout(connectPetWs, 3000);
  }
  ws = sock;
  sock.addEventListener("open", () => {
    wsReady = true;
    lastSent = null; // force resend of current state on (re)connect
    log("pet ws connected:", PET_WS);
    pushState(pendingState, pendingTask, true);
  });
  sock.addEventListener("close", () => {
    wsReady = false;
    log("pet ws closed; reconnect in 3s");
    setTimeout(connectPetWs, 3000);
  });
  sock.addEventListener("error", (e) => {
    log("pet ws error:", (e && e.message) || "");
    try { sock.close(); } catch {}
  });
  sock.addEventListener("message", () => { /* acks ignored */ });
}

function pushState(state, task, force = false) {
  pendingState = state;
  pendingTask = task || "";
  const messageType = STATE_MAP[state] || "processing";
  if (!wsReady) return;
  if (!force && messageType === lastSent) return; // de-dupe repeats
  lastSent = messageType;
  try {
    ws.send(JSON.stringify({
      message_type: messageType,
      source: "jimmy",
      payload: { state, task: pendingTask },
      timestamp: Date.now(),
    }));
    log("-> pet:", state, "=>", messageType);
  } catch (e) {
    log("send failed:", e.message);
  }
}

async function consumeFeed() {
  for (;;) {
    try {
      log("connecting feed:", FEED_URL);
      const res = await fetch(FEED_URL, { headers: { Accept: "text/event-stream" } });
      if (!res.ok || !res.body) throw new Error("feed HTTP " + res.status);
      log("feed connected");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of chunk.split("\n")) {
            const m = line.match(/^data:\s?(.*)$/);
            if (!m) continue;
            try {
              const obj = JSON.parse(m[1]);
              if (obj && obj.state) pushState(obj.state, obj.task);
            } catch { /* ignore keepalives / partial */ }
          }
        }
      }
      throw new Error("feed stream ended");
    } catch (e) {
      log("feed error:", e.message, "- retry 3s");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

log("jimmy-bridge starting | feed:", FEED_URL, "| pet:", PET_WS);
connectPetWs();
consumeFeed();
