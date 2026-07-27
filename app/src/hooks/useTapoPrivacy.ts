"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

/**
 * Estado do modo privacidade de uma câmera Tapo. O poll existe porque o modo
 * também pode ser ligado pelo app da Tapo — sem ele o card ficaria mentindo
 * até a página ser recarregada.
 */
export function useTapoPrivacy(cameraId: string) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return fetch(`/api/tapo-cameras/${cameraId}/privacy`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setEnabled(Boolean(data.enabled));
          setError(null);
        } else {
          setError(data?.error ?? "Câmera não respondeu");
        }
      })
      .catch(() => setError("Câmera não respondeu"));
  }, [cameraId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (busy || enabled === null) return;
    const next = !enabled;

    setBusy(true);
    setEnabled(next); // otimista: o toggle responde na hora
    try {
      const res = await fetch(`/api/tapo-cameras/${cameraId}/privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEnabled(!next);
        setError(data?.error ?? "Não foi possível alterar o modo privacidade");
      } else {
        setError(null);
      }
    } catch {
      setEnabled(!next);
      setError("Não foi possível alterar o modo privacidade");
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, cameraId]);

  return { enabled, busy, error, toggle, refresh };
}
