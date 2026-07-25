import type { ConnectionStatus } from "@/hooks/useHaEntities";
import { DANGER, SUCCESS, TEXT_MUTED_2 } from "@/lib/theme";

const LABELS: Record<ConnectionStatus, string> = {
  live: "Conectado",
  error: "Erro de conexão",
  connecting: "Conectando...",
};

const COLORS: Record<ConnectionStatus, string> = {
  live: SUCCESS,
  error: DANGER,
  connecting: TEXT_MUTED_2,
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: COLORS[status],
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: COLORS[status],
        }}
      />
      {LABELS[status]}
    </div>
  );
}
