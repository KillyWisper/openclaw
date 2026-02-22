import type { LogsTailResult } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadLogsTail(
  request: GatewayRequest,
  opts?: { cursor?: number },
): Promise<LogsTailResult> {
  const result = await request<LogsTailResult>("logs.tail", {
    cursor: opts?.cursor ?? 0,
  });
  return result ?? { file: "", cursor: 0, size: 0, lines: [], truncated: false, reset: false };
}
