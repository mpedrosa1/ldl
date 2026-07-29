"use client";

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import type { FloorPlanDoc } from "@/lib/floorplan/types";
import { DEFAULT_LAYER_STATE, type LayerState } from "@/lib/floorplan/layers";
import { rotateDoc } from "@/lib/floorplan/geometry";
import { FloorPlanCanvas, type EditMode } from "./FloorPlanCanvas";
import { Toolbar } from "./Toolbar";
import { DevicePalette } from "./DevicePalette";
import { LayersPanel } from "./LayersPanel";
import { TEXT_MUTED_3 } from "@/lib/theme";

export function FloorPlanEditor({
  doc,
  onChange,
  entities,
}: {
  doc: FloorPlanDoc;
  onChange: (doc: FloorPlanDoc) => void;
  entities: HassEntity[];
}) {
  const [mode, setMode] = useState<EditMode>("select");
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYER_STATE);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Toolbar
          mode={mode}
          onChange={setMode}
          onRotateAll={(degrees) => onChange(rotateDoc(doc, degrees))}
        />
        <div style={{ fontSize: 12, color: TEXT_MUTED_3 }}>
          Scroll para zoom · botão do meio do mouse arrasta a tela · <strong>Piso</strong>/
          <strong>Parede</strong>: clique e arraste para desenhar · <strong>Porta</strong>/
          <strong>Janela</strong>: clique numa parede · arraste itens já colocados para
          reposicionar (puxe o canto para redimensionar)
        </div>
      </div>

      <div className="ldl-editor-body">
        <div className="ldl-editor-aside">
          <DevicePalette />
          <LayersPanel layers={layers} onChange={setLayers} />
        </div>
        <div className="ldl-editor-canvas">
          <FloorPlanCanvas
            doc={doc}
            onChange={onChange}
            mode={mode}
            entities={entities}
            layers={layers}
            showRulers
          />
        </div>
      </div>
    </div>
  );
}
