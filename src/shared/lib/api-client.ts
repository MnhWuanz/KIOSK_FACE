import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { STORAGE_KEYS } from "@/src/shared/constants/storage";
import { clearDeviceSession, getDeviceCredentials } from "./device-storage";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const env = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env;

export const apiClient = axios.create({
  baseURL: env?.VITE_API_URL ?? "",
  timeout: 12_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const { deviceCode, deviceToken } = getDeviceCredentials();

  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (deviceCode) config.headers["x-kiosk-device-code"] = deviceCode;
  if (deviceToken) config.headers["x-kiosk-token"] = deviceToken;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as RetryableConfig | undefined;
    const isRefreshRequest = original?.url?.includes("/auth/refresh");

    if (error.response?.status !== 401 || !original || original._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const response = await axios.post(
        `${env?.VITE_API_URL ?? ""}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const token = response.data?.data?.accessToken ?? response.data?.accessToken;
      if (token) localStorage.setItem(STORAGE_KEYS.accessToken, token);
      return apiClient(original);
    } catch (refreshError) {
      clearDeviceSession();
      if (typeof window !== "undefined") window.location.replace("/");
      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? (error.code === "ECONNABORTED" ? "Máy chủ phản hồi quá lâu." : fallback);
  }
  return error instanceof Error ? error.message : fallback;
}
