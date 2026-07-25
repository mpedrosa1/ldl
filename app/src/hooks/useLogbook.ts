"use client";

import { useEffect, useState } from "react";

export interface LogbookEntry {
  when: string;
  name: string;
  message?: string;
  entity_id?: string;
  domain?: string;
  state?: string;
}

/** Polls the real HA Logbook every minute — no fabricated activity feed. */
export function useLogbook() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch("/api/ha/logbook")
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setEntries(data);
        })
        .catch(() => {});
    }

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return entries;
}
