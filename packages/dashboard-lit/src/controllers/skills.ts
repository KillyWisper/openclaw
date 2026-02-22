import type { SkillStatusReport } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadSkillsStatus(
  request: GatewayRequest,
  opts?: { agentId?: string },
): Promise<SkillStatusReport> {
  const result = await request<SkillStatusReport>("skills.status", {
    agentId: opts?.agentId,
  });
  return result ?? { workspaceDir: "", managedSkillsDir: "", skills: [] };
}
