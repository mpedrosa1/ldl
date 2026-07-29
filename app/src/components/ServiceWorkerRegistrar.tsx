"use client";

import { useEffect } from "react";

/**
 * Registra o service worker que torna o LDL instalável.
 *
 * Só em produção: em desenvolvimento um SW guardando o casco do app briga com
 * o hot reload e serve build velho.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      // `updateViaCache: none` faz o navegador sempre buscar o sw.js na rede,
      // senão uma versão antiga pode ficar presa no cache HTTP por horas.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("[pwa] falha ao registrar o service worker", err));
  }, []);

  return null;
}
