"use client";

import { CameraTile } from "@/components/CameraTile";
import { useTapoPrivacy } from "@/hooks/useTapoPrivacy";

/** Câmeras Tapo ganham o controle de modo privacidade (lens mask), que vem da
 * API local da câmera — as do Home Assistant não têm equivalente. */
export function TapoCameraTile({
  cameraId,
  name,
  snapshotUrl,
  onClick,
}: {
  cameraId: string;
  name: string;
  snapshotUrl: string;
  onClick: () => void;
}) {
  const { enabled, busy, toggle } = useTapoPrivacy(cameraId);

  return (
    <CameraTile
      name={name}
      snapshotUrl={snapshotUrl}
      onClick={onClick}
      privacy={{ enabled, busy, onToggle: toggle }}
    />
  );
}
