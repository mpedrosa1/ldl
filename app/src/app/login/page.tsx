"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ACCENT, BG, BORDER_STRONG, CARD_BG, DANGER, FONT_FAMILY, INPUT_BG, TEXT, TEXT_MUTED_3 } from "@/lib/theme";

/** `useSearchParams` obriga a um boundary de Suspense em rota prerenderizada. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Não foi possível entrar.");
        return;
      }
      // `refresh` para o servidor reavaliar a sessão antes de navegar.
      const destino = searchParams.get("de") ?? "/";
      router.replace(destino);
      router.refresh();
    } catch {
      setError("Não foi possível falar com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(24px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left))",
        background: BG,
        color: TEXT,
        fontFamily: FONT_FAMILY,
        boxSizing: "border-box",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(360px, 100%)",
          background: CARD_BG,
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estática da marca */}
        <img
          src="/logo.png"
          alt="Lar, Doce Lar"
          style={{ width: 132, height: "auto", display: "block", margin: "0 auto 4px" }}
        />

        <label style={{ fontSize: 12, color: TEXT_MUTED_3 }}>Senha da casa</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          style={{
            background: INPUT_BG,
            border: `1px solid ${BORDER_STRONG}`,
            borderRadius: 8,
            padding: "11px 12px",
            color: TEXT,
            fontSize: 15,
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {error && <div style={{ fontSize: 12, color: DANGER }}>{error}</div>}

        <button
          type="submit"
          disabled={busy}
          style={{
            background: ACCENT,
            color: "oklch(0.15 0.01 50)",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            borderRadius: 8,
            padding: "11px 18px",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>

        <div style={{ fontSize: 11, color: TEXT_MUTED_3, textAlign: "center" }}>
          Este aparelho fica conectado por 90 dias.
        </div>
      </form>
    </div>
  );
}
