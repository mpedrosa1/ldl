"use client";

import { useCallback, useEffect, useState } from "react";

export interface HaArea {
  area_id: string;
  name: string;
}

export interface HaDevice {
  id: string;
  name: string;
  area_id: string | null;
}

export interface EntityMeta {
  area_id: string | null;
  entity_category: "config" | "diagnostic" | null;
  hidden: boolean;
}

interface AreaAssignments {
  areas: HaArea[];
  devices: HaDevice[];
  entityArea: Record<string, string | null>;
  entityDevice: Record<string, string | null>;
  entityMeta: Record<string, EntityMeta>;
}

const EMPTY: AreaAssignments = {
  areas: [],
  devices: [],
  entityArea: {},
  entityDevice: {},
  entityMeta: {},
};

/** Areas/devices change rarely, so this is a one-shot fetch (no live subscription) — call `refresh` after renaming a device to pick up the new name right away. */
export function useHaAreas() {
  const [data, setData] = useState<AreaAssignments>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/ha/areas")
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loaded, refresh };
}
