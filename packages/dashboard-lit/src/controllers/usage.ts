import type { SessionsUsageResult } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadUsage(
  request: GatewayRequest,
  opts?: { days?: number },
): Promise<SessionsUsageResult> {
  const days = opts?.days ?? 3;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const result = await request<SessionsUsageResult>("sessions.usage", {
    startDate: fmt(start),
    endDate: fmt(end),
  });
  return (
    result ?? {
      updatedAt: 0,
      startDate: fmt(start),
      endDate: fmt(end),
      sessions: [],
      totals: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
        missingCostEntries: 0,
      },
      aggregates: {
        messages: { total: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, errors: 0 },
        tools: { totalCalls: 0, uniqueTools: 0, tools: [] },
        byModel: [],
        byProvider: [],
        byAgent: [],
        byChannel: [],
        daily: [],
      },
    }
  );
}
