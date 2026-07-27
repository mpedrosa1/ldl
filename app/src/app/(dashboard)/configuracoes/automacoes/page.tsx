"use client";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { AutomationsSection } from "@/components/automations/AutomationsSection";

export default function ConfiguracoesAutomacoesPage() {
  return (
    <div>
      <SettingsPageHeader />
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Automações</div>
      <AutomationsSection />
    </div>
  );
}
