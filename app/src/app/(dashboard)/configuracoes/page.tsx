"use client";

import Link from "next/link";
import { useFloorPlan } from "@/hooks/useFloorPlan";
import { useTapoCameras } from "@/hooks/useTapoCameras";
import { useCustomDevices } from "@/hooks/useCustomDevices";
import { useAutomations } from "@/hooks/useAutomations";
import { AccessCard } from "@/components/AccessCard";
import { ACCENT, BORDER, CARD_BG, TEXT_MUTED_3 } from "@/lib/theme";

function SettingsCard({
  title,
  description,
  stats,
  href,
  cta,
  /** Ferramentas que não fazem sentido no celular escondem só o botão — o
   * card continua explicando o que é. */
  desktopOnly = false,
  phoneNote,
}: {
  title: string;
  description: string;
  stats?: string;
  href: string;
  cta: string;
  desktopOnly?: boolean;
  phoneNote?: string;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>{description}</div>
      {stats && <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>{stats}</div>}
      <Link
        href={href}
        className={desktopOnly ? "ldl-hide-phone" : undefined}
        style={{
          display: "inline-block",
          background: ACCENT,
          color: "oklch(0.15 0.01 50)",
          fontWeight: 700,
          fontSize: 13,
          padding: "9px 18px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        {cta}
      </Link>
      {desktopOnly && phoneNote && (
        <div className="ldl-only-phone" style={{ fontSize: 12, color: TEXT_MUTED_3 }}>
          {phoneNote}
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { doc, loaded: floorPlanLoaded } = useFloorPlan();
  const { cameras } = useTapoCameras();
  const { devices: customDevices } = useCustomDevices();
  const { automations } = useAutomations();

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Configurações</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <AccessCard />

        <SettingsCard
          title="Planta baixa"
          description="Desenhe as paredes da sua casa, marque portas e janelas, e posicione ícones de dispositivos (TV, projetor, lâmpada, ar-condicionado, sensores...), cada um podendo ser vinculado a uma entidade real do Home Assistant. O editor abre numa página própria, com mais espaço para desenhar."
          stats={
            floorPlanLoaded
              ? `${doc.walls.length} paredes · ${doc.openings.length} portas/janelas · ${doc.devices.length} dispositivos posicionados`
              : undefined
          }
          href="/planta-baixa"
          cta="Abrir editor de planta baixa"
          desktopOnly
          phoneNote="Desenhar a planta exige precisão de mouse — abra o LDL num computador ou tablet para editar. Aqui no celular ela continua visível na página Início."
        />

        <SettingsCard
          title="Câmeras Tapo"
          description="Conecta direto na câmera via RTSP local, sem precisar do Home Assistant — cadastre nome, IP e a conta de câmera de cada uma."
          stats={`${cameras.length} câmera${cameras.length === 1 ? "" : "s"} cadastrada${cameras.length === 1 ? "" : "s"}`}
          href="/configuracoes/cameras"
          cta="Gerenciar câmeras"
        />

        <SettingsCard
          title="Automações"
          description="Monte automações encaixando blocos coloridos, no estilo do Scratch: um bloco QUANDO define o que dispara, e os blocos abaixo executam em ordem — com se/senão, repetições, esperas e variáveis. Roda tudo aqui no LDL, sem depender das automações do Home Assistant."
          stats={`${automations.length} automação${automations.length === 1 ? "" : "ões"} criada${automations.length === 1 ? "" : "s"}`}
          href="/configuracoes/automacoes"
          cta="Gerenciar automações"
        />

        <SettingsCard
          title="Dispositivos"
          description="Monte os cards que aparecem na página Cômodos, combinando uma ou mais entidades do Home Assistant num só card — com sugestões prontas a partir dos dispositivos que já existem lá no HA. A Área escolhida em cada card define em qual aba de cômodo ele aparece."
          stats={`${customDevices.length} dispositivo${customDevices.length === 1 ? "" : "s"} criado${customDevices.length === 1 ? "" : "s"}`}
          href="/configuracoes/entidades"
          cta="Gerenciar dispositivos"
        />
      </div>
    </div>
  );
}
