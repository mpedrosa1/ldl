"use client";

import { useSyncExternalStore } from "react";
import type { HassEntity } from "home-assistant-js-websocket";

export type ConnectionStatus = "connecting" | "live" | "error";

interface SharedState {
  entities: HassEntity[];
  status: ConnectionStatus;
}

let sharedState: SharedState = { entities: [], status: "connecting" };
let source: EventSource | null = null;
let refCount = 0;
const listeners = new Set<() => void>();

function setShared(next: SharedState) {
  sharedState = next;
  for (const notify of listeners) notify();
}

function openConnection() {
  if (source) return;

  fetch("/api/ha/states")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) setShared({ ...sharedState, entities: data });
    })
    .catch(() => setShared({ ...sharedState, status: "error" }));

  source = new EventSource("/api/ha/stream");
  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data?.error) {
      setShared({ ...sharedState, status: "error" });
      return;
    }
    setShared({ entities: data, status: "live" });
  };
  source.onerror = () => setShared({ ...sharedState, status: "error" });
}

function closeConnection() {
  source?.close();
  source = null;
  sharedState = { entities: [], status: "connecting" };
}

function subscribe(onStoreChange: () => void) {
  refCount += 1;
  openConnection();
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    refCount -= 1;
    if (refCount === 0) closeConnection();
  };
}

function getSnapshot(): SharedState {
  return sharedState;
}

/**
 * Live entity list backed by a single shared SSE connection to
 * /api/ha/stream. Every component that calls this hook shares the same
 * underlying EventSource instead of opening its own — a page rendering
 * several device cards (each calling this hook) used to open one SSE
 * connection per card, and simultaneous SSE connections count against the
 * browser's per-origin connection limit (6 on HTTP/1.1). Once that limit
 * was hit, every further request to the app — including page navigation —
 * queued behind those open connections instead of going through.
 */
export function useHaEntities(): SharedState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function callService(
  domain: string,
  service: string,
  entityId: string | string[],
  data?: Record<string, unknown>,
) {
  return fetch("/api/ha/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, service, entity_id: entityId, data }),
  });
}
