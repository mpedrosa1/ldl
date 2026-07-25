"use client";

import { useCallback, useEffect, useState } from "react";

export interface CustomDevice {
  id: string;
  name: string;
  icon?: string;
  areaId?: string;
  entityIds: string[];
  isSwitch?: boolean;
  cameraVisibility?: Record<string, boolean>;
}

export interface CustomDeviceInput {
  name: string;
  icon?: string;
  areaId?: string;
  entityIds: string[];
  isSwitch?: boolean;
  cameraVisibility?: Record<string, boolean>;
}

export function useCustomDevices() {
  const [devices, setDevices] = useState<CustomDevice[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/custom-devices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDevices(data);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(input: CustomDeviceInput): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/custom-devices", {
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
    patch: Partial<CustomDeviceInput>,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/custom-devices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) await refresh();
    return { ok: res.ok, error: res.ok ? undefined : data?.error };
  }

  async function remove(id: string): Promise<boolean> {
    const res = await fetch(`/api/custom-devices/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
    return res.ok;
  }

  return { devices, loaded, refresh, create, update, remove };
}
