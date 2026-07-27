"use client";

import { useCallback, useEffect, useState } from "react";
import type { Automation, AutomationRunEntry } from "@/lib/automations/types";

export function useAutomations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/automations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAutomations(data);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(input: Omit<Automation, "id">): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/automations", {
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
    patch: Partial<Omit<Automation, "id">>,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/automations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) await refresh();
    return { ok: res.ok, error: res.ok ? undefined : data?.error };
  }

  async function remove(id: string): Promise<boolean> {
    const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
    return res.ok;
  }

  async function run(id: string): Promise<AutomationRunEntry | null> {
    const res = await fetch(`/api/automations/${id}/run`, { method: "POST" });
    return res.ok ? ((await res.json()) as AutomationRunEntry) : null;
  }

  return { automations, loaded, refresh, create, update, remove, run };
}
