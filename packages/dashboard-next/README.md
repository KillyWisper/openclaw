# OpenClaw Dashboard (Next preview)

This is a **phase 1, low-lift preview** of a Next.js dashboard that coexists with the current Lit Control UI.

## Security posture (phase 1)

- Gateway remains the source of truth for auth, pairing, scopes, and method authorization.
- This app is a browser client only; it does not introduce privileged Next API routes.
- URL bootstrap behavior:
  - `token` may be consumed and persisted locally.
  - `password` is scrubbed from URL and never hydrated from URL.
  - `gatewayUrl` may be consumed for remote/Tailscale testing and persisted locally.

## Run

```bash
pnpm dashboard-next:dev
```

## Phase 1 Checklist

- [x] App scaffold with App Router + TS
- [x] Shared WS gateway client package
- [x] URL bootstrap + sanitization path
- [x] Overview route (read-only status/snapshot)
- [x] Chat route (minimal send path)
- [ ] Feature flag and integrated gateway-serving route
- [ ] Parity checks vs existing Control UI tabs
- [ ] Security/performance gate review
