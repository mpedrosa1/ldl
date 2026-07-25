"use client";

import { useEffect, useState } from "react";

/** null until mounted, to avoid SSR/client hydration mismatches on the current time. */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Seeded only after mount (not via a lazy initial state) so the server
    // and first client render match; the real time then fills in here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function dateLabelFor(now: Date): string {
  return now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function timeLabelFor(now: Date): string {
  return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
