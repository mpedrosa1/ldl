"use client";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { CustomDevicesSection } from "@/components/CustomDevicesSection";

export default function ConfiguracoesDispositivosPage() {
  return (
    <div>
      <SettingsPageHeader />
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Dispositivos</div>
      <CustomDevicesSection />
    </div>
  );
}
