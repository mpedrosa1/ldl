"use client";

import { useEffect, useState } from "react";
import { DANGER } from "@/lib/theme";

export function CameraTile({
  name,
  snapshotUrl,
  onClick,
}: {
  name: string;
  snapshotUrl: string;
  onClick: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const separator = snapshotUrl.includes("?") ? "&" : "?";

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid oklch(0.36 0.016 50)",
        aspectRatio: "16/9",
        cursor: "pointer",
        background: "oklch(0.16 0.01 50)",
      }}
    >
      {/* Always rendered (even while offline) so it keeps retrying on every
          tick — if the camera comes back online this recovers on its own. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- proxied camera snapshot, not an optimizable static asset */}
      <img
        src={`${snapshotUrl}${separator}t=${tick}`}
        alt={name}
        onError={() => setOffline(true)}
        onLoad={() => setOffline(false)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: offline ? "none" : "block",
        }}
      />
      {offline && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "oklch(0.55 0.01 50)",
          }}
        >
          Câmera indisponível
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "oklch(0.14 0.01 50 / 0.7)",
          padding: "4px 10px",
          borderRadius: 999,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: DANGER,
            animation: "livePulse 1.6s infinite",
          }}
        />
        <div style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.97 0 0)" }}>
          AO VIVO
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "oklch(0.97 0 0)",
          textShadow: "0 1px 4px oklch(0 0 0 / 0.6)",
        }}
      >
        {name}
      </div>
    </div>
  );
}
