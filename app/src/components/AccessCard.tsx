"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCENT, BORDER, CARD_BG, DANGER, TEXT_MUTED_3 } from "@/lib/theme";

/** Estado do login da casa, em Configurações: sair do aparelho ou avisar que
 * o sistema está sem senha nenhuma. */
export function AccessCard() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => setEnabled(Boolean(data?.enabled)))
      .catch(() => setEnabled(null));
  }, []);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return null;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Acesso</div>

      {enabled ? (
        <>
          <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>
            O LDL está protegido por senha. Este aparelho fica conectado por 90 dias; sair aqui
            desconecta só ele.
          </div>
          <div
            onClick={busy ? undefined : handleLogout}
            style={{
              display: "inline-block",
              background: ACCENT,
              color: "oklch(0.15 0.01 50)",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 18px",
              borderRadius: 8,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Saindo..." : "Sair deste aparelho"}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: TEXT_MUTED_3, lineHeight: 1.6 }}>
          <strong style={{ color: DANGER }}>O sistema está sem senha.</strong> Qualquer pessoa que
          alcance este endereço controla a casa — acende luzes, vê as câmeras e roda automações.
          <br />
          <br />
          Para proteger, defina <code>APP_PASSWORD</code> no arquivo <code>.env</code> do NAS e
          suba o container de novo. Enquanto isso não for feito, tudo continua aberto.
        </div>
      )}
    </div>
  );
}
