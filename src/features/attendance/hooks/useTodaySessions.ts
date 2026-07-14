"use client";

import { useCallback, useEffect, useState } from "react";
import type { TodaySessionData } from "@/src/shared/types/kiosk";
import { getTodaySessions } from "../api/attendance.api";

export function useTodaySessions(intervalMs = 30_000) {
  const [data, setData] = useState<TodaySessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await getTodaySessions();
      setData(response.data);
      setError(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [intervalMs, refresh]);

  return { data, loading, error, refresh };
}
