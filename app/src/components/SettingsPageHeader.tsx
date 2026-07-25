"use client";

import Link from "next/link";
import { ACCENT } from "@/lib/theme";

export function SettingsPageHeader() {
  return (
    <Link
      href="/configuracoes"
      style={{
        display: "inline-block",
        fontSize: 13,
        color: ACCENT,
        textDecoration: "none",
        marginBottom: 16,
      }}
    >
      ← Configurações
    </Link>
  );
}
