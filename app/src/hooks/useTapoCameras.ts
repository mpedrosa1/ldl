"use client";

import { useCallback, useEffect, useState } from "react";

export interface TapoCameraPublic {
  id: string;
  name: string;
  host: string;
  username: string;
  streamPath: "stream1" | "stream2";
}

export interface TapoCameraInput {
  name: string;
  host: string;
  username: string;
  password?: string;
}

export function useTapoCameras() {
  const [cameras, setCameras] = useState<TapoCameraPublic[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/tapo-cameras")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCameras(data);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(input: TapoCameraInput): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/tapo-cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (res.ok) await refresh();
    return { ok: res.ok, error: res.ok ? undefined : data?.error };
  }

  async function update(
    id: string,
    patch: Partial<TapoCameraInput>,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/tapo-cameras/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) await refresh();
    return { ok: res.ok, error: res.ok ? undefined : data?.error };
  }

  async function remove(id: string): Promise<boolean> {
    const res = await fetch(`/api/tapo-cameras/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
    return res.ok;
  }

  return { cameras, loaded, refresh, create, update, remove };
}
