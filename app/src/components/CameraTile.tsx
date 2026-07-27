"use client";

import { useEffect, useState } from "react";
import { ACCENT, DANGER } from "@/lib/theme";

export interface CameraPrivacy {
  enabled: boolean | null;
  busy: boolean;
  onToggle: () => void;
}

function PrivacyIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5c-5 0-9.27 3.11-11 7 1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      {crossed && <path d="M3.2 2 22 20.8l-1.4 1.4L1.8 3.4z" />}
    </svg>
  );
}

export function CameraTile({
  name,
  snapshotUrl,
  onClick,
  privacy,
}: {
  name: string;
  snapshotUrl: string;
  onClick: () => void;
  privacy?: CameraPrivacy;
}) {
  const [tick, setTick] = useState(0);
  const [offline, setOffline] = useState(false);

  const privacyOn = privacy?.enabled === true;

  useEffect(() => {
    // Com o modo privacidade ligado a lente está tapada: continuar pedindo
    // snapshot só gastaria um processo ffmpeg a cada 2s para nada.
    if (privacyOn) return;
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, [privacyOn]);

  const separator = snapshotUrl.includes("?") ? "&" : "?";

  return (
    <div
      onClick={privacyOn ? undefined : onClick}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid oklch(0.36 0.016 50)",
        aspectRatio: "16/9",
        cursor: privacyOn ? "default" : "pointer",
        background: "oklch(0.16 0.01 50)",
      }}
    >
      {/* Always rendered (even while offline) so it keeps retrying on every
          tick — if the camera comes back online this recovers on its own. */}
      {!privacyOn && (
        // eslint-disable-next-line @next/next/no-img-element -- proxied camera snapshot, not an optimizable static asset
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
      )}
      {privacyOn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "oklch(0.62 0.01 50)",
          }}
        >
          <PrivacyIcon crossed />
          <div style={{ fontSize: 13 }}>Modo privacidade ativo</div>
        </div>
      )}
      {offline && !privacyOn && (
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
            background: privacyOn ? ACCENT : DANGER,
            animation: privacyOn ? undefined : "livePulse 1.6s infinite",
          }}
        />
        <div style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.97 0 0)" }}>
          {privacyOn ? "PRIVACIDADE" : "AO VIVO"}
        </div>
      </div>
      {privacy && privacy.enabled !== null && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            privacy.onToggle();
          }}
          title={privacyOn ? "Desativar modo privacidade" : "Ativar modo privacidade"}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: privacyOn ? ACCENT : "oklch(0.14 0.01 50 / 0.7)",
            color: privacyOn ? "oklch(0.15 0.01 50)" : "oklch(0.97 0 0)",
            padding: "5px 11px",
            borderRadius: 999,
            cursor: privacy.busy ? "default" : "pointer",
            opacity: privacy.busy ? 0.6 : 1,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <PrivacyIcon crossed={privacyOn} />
          Privacidade
        </div>
      )}
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
