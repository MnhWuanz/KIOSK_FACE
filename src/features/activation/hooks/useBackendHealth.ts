"use client";

import { useCallback, useEffect, useState } from "react";
import { checkBackendHealth } from "../api/activation.api";

export function useBackendHealth(intervalMs = 10_000) {
  const [online, setOnline] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    try {
      await checkBackendHealth();
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void check(), 0);
    const timer = window.setInterval(check, intervalMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [check, intervalMs]);
  return online;
}
