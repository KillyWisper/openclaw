import type { ModelCatalogEntry } from "../types/dashboard.js";

type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export async function loadModels(request: GatewayRequest): Promise<ModelCatalogEntry[]> {
  const result = await request<{ models: ModelCatalogEntry[] }>("models.list", {});
  return result?.models ?? [];
}
