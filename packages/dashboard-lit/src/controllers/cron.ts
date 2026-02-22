import type { CronJob, CronStatusSummary } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadCronJobs(
  request: GatewayRequest,
  opts?: { includeDisabled?: boolean },
): Promise<CronJob[]> {
  const result = await request<{ jobs: CronJob[] }>("cron.list", {
    includeDisabled: opts?.includeDisabled ?? true,
  });
  return result?.jobs ?? [];
}

export async function loadCronStatus(request: GatewayRequest): Promise<CronStatusSummary> {
  const result = await request<CronStatusSummary>("cron.status", {});
  return result ?? { enabled: false, jobs: 0, nextWakeAtMs: null };
}
