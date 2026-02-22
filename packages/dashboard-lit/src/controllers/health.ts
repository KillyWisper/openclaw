import type { HealthSummary } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadHealth(request: GatewayRequest): Promise<HealthSummary> {
  const result = await request<HealthSummary>("health", {});
  return (
    result ?? {
      ok: false,
      ts: 0,
      durationMs: 0,
      heartbeatSeconds: 0,
      defaultAgentId: "",
      agents: [],
      sessions: { path: "", count: 0, recent: [] },
    }
  );
}
