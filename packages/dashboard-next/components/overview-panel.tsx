"use client";

import { useGateway } from "./gateway-provider";

export function OverviewPanel() {
  const gateway = useGateway();

  return (
    <>
      <section className="panel">
        <h2>Connection</h2>
        <div className="status-row">
          <span className="status-pill">{gateway.connected ? "Connected" : "Disconnected"}</span>
          <span className="status-pill">{gateway.connecting ? "Reconnecting" : "Stable"}</span>
        </div>
        {gateway.lastError ? <p className="error">{gateway.lastError}</p> : null}
        <p className="muted">
          Phase 1 preview: Gateway is still the security/control plane. This UI does not bypass
          auth, pairing, or scope checks.
        </p>
      </section>

      <section className="panel">
        <h2>Hello snapshot</h2>
        <pre>{JSON.stringify(gateway.hello, null, 2) || "(waiting for hello-ok)"}</pre>
      </section>

      <section className="panel">
        <h2>Latest event</h2>
        <pre>{JSON.stringify(gateway.lastEvent, null, 2) || "(no events yet)"}</pre>
      </section>
    </>
  );
}
