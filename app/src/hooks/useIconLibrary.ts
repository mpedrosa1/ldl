"use client";

import { useCallback, useEffect, useState } from "react";

export interface IconEntry {
  url: string;
  name: string;
}

export function useIconLibrary() {
  const [icons, setIcons] = useState<IconEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetch("/api/icons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIcons(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Fetches the icon library on mount (an external system, not derivable from props/state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function upload(file: File): Promise<IconEntry | null> {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/icons", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Falha ao enviar imagem");
      return null;
    }
    const icon: IconEntry = await res.json();
    await refresh();
    return icon;
  }

  return { icons, loading, error, upload, refresh };
}
