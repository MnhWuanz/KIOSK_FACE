import { apiClient } from "@/src/shared/lib/api-client";
import type { ActivationData, ApiResponse } from "@/src/shared/types/kiosk";

export async function activateKiosk(code: string) {
  const { data } = await apiClient.post<ApiResponse<ActivationData>>("/api/kiosks/activate", { code });
  return data;
}

export async function checkBackendHealth() {
  await apiClient.get("/api/kiosks/health", { timeout: 3_000 });
  return true;
}
