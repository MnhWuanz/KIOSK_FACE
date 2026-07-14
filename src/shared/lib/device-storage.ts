import { STORAGE_KEYS } from "@/src/shared/constants/storage";
import type { ActivationData, KioskInfo } from "@/src/shared/types/kiosk";

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function saveActivation(data: ActivationData) {
  const local = storage();
  if (!local) return;
  local.setItem(STORAGE_KEYS.deviceCode, data.kiosk.device_code);
  local.setItem(STORAGE_KEYS.deviceToken, data.deviceToken);
  local.setItem(STORAGE_KEYS.kioskInfo, JSON.stringify(data.kiosk));
}

export function getDeviceCredentials() {
  const local = storage();
  return {
    deviceCode: local?.getItem(STORAGE_KEYS.deviceCode) ?? "",
    deviceToken: local?.getItem(STORAGE_KEYS.deviceToken) ?? "",
  };
}

export function getKioskInfo(): KioskInfo | null {
  const value = storage()?.getItem(STORAGE_KEYS.kioskInfo);
  if (!value) return null;
  try {
    return JSON.parse(value) as KioskInfo;
  } catch {
    return null;
  }
}

export function isActivated() {
  const { deviceCode, deviceToken } = getDeviceCredentials();
  return Boolean(deviceCode && deviceToken);
}

export function clearDeviceSession() {
  const local = storage();
  if (!local) return;
  Object.values(STORAGE_KEYS).forEach((key) => local.removeItem(key));
}
