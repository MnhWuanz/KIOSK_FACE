import { useEffect, useState } from 'react';

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  return {
    time:
      now?.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }) ?? '--:--',
    date:
      now?.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) ?? 'Đang tải...',
  };
}
