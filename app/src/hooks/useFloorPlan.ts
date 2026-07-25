"use client";

import { useEffect, useState } from "react";
import { EMPTY_FLOOR_PLAN, type FloorPlanDoc } from "@/lib/floorplan/types";

export function useFloorPlan() {
  const [doc, setDoc] = useState<FloorPlanDoc>(EMPTY_FLOOR_PLAN);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/floorplan")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && !data.error) setDoc(data);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: FloorPlanDoc) {
    setSaving(true);
    try {
      const res = await fetch("/api/floorplan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setDoc(next);
        setSavedAt(Date.now());
      }
      return res.ok;
    } finally {
      setSaving(false);
    }
  }

  return { doc, setDoc, loaded, saving, savedAt, save };
}
