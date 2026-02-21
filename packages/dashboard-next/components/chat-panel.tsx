"use client";

import { useState } from "react";
import { useGateway } from "./gateway-provider";

type ChatEventPayload = {
  runId?: string;
  state?: string;
  delta?: string;
  text?: string;
};

export function ChatPanel() {
  const gateway = useGateway();
  const [sessionKey, setSessionKey] = useState("main");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const latestChatEvent =
    gateway.lastEvent?.event === "chat"
      ? (gateway.lastEvent.payload as ChatEventPayload | undefined)
      : null;

  async function onSend() {
    const trimmed = message.trim();
    if (!trimmed || submitting) {
      return;
    }
    setSubmitting(true);
    setLogLines((prev) => [`You: ${trimmed}`, ...prev].slice(0, 120));
    setMessage("");
    try {
      await gateway.request("chat.send", {
        sessionKey,
        message: trimmed,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setLogLines((prev) => [`Error: ${text}`, ...prev].slice(0, 120));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Chat (preview)</h2>
      <p className="muted">
        Minimal phase-1 chat path. Uses existing gateway method/event flow without introducing new
        privileged API surfaces.
      </p>

      <div className="input-row">
        <input
          value={sessionKey}
          onChange={(event) => setSessionKey(event.target.value)}
          placeholder="session key"
        />
      </div>

      <div className="input-row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type a message"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void onSend();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={submitting || !gateway.connected}
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Last chat event</h3>
        <pre>{JSON.stringify(latestChatEvent, null, 2) || "(none)"}</pre>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Local transcript</h3>
        <div className="chat-log">
          {logLines.length === 0 ? <p className="muted">No messages yet.</p> : null}
          {logLines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
