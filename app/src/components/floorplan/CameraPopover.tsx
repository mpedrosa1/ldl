"use client";

import { useRef, useState } from "react";
import { TapoVideoPlayer } from "@/components/TapoVideoPlayer";
import { cameraMedia } from "@/lib/cameras/list";
import { BORDER_STRONG, CARD_BG, TEXT_MUTED_2 } from "@/lib/theme";

export const POPOVER_WIDTH = 320;
/** 16:9 — a proporção das câmeras. Com a janela em outra proporção sobra
 * tarja preta (ou, se fosse `cover`, a imagem seria cortada justamente nas
 * bordas, onde ficam a data e o nome da câmera). */
export const POPOVER_HEIGHT = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Janelinha com o vídeo ao vivo, ancorada no ícone da câmera na planta baixa.
 * É HTML sobreposto ao SVG, não `foreignObject`: dentro do SVG o conteúdo
 * escalaria junto com a planta, e o player ficaria minúsculo ou gigante
 * dependendo do zoom do desenho.
 *
 * Fecha só pelo "×" — clicar fora não fecha, para dar para mexer no resto da
 * planta com a câmera à vista.
 */
export function CameraPopover({
  cameraKey,
  name,
  left,
  top,
  onClose,
}: {
  cameraKey: string;
  name: string;
  left: number;
  top: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left, top });
  // Guarda onde dentro da janela o usuário pegou, para ela não "pular" para o
  // cursor no primeiro movimento.
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const media = cameraMedia(cameraKey);

  function parentRect(): DOMRect | null {
    const parent = ref.current?.offsetParent as HTMLElement | null;
    return parent ? parent.getBoundingClientRect() : null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Os controles do player e o botão de fechar precisam continuar clicáveis.
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
    const box = parentRect();
    if (!box) return;

    grab.current = {
      dx: event.clientX - box.left - position.left,
      dy: event.clientY - box.top - position.top,
    };
    setDragging(true);
    ref.current?.setPointerCapture(event.pointerId);
    // Sem isto o navegador inicia o arraste nativo da imagem/vídeo.
    event.preventDefault();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = grab.current;
    const box = parentRect();
    if (!start || !box) return;

    setPosition({
      left: clamp(event.clientX - box.left - start.dx, 0, box.width - POPOVER_WIDTH),
      top: clamp(event.clientY - box.top - start.dy, 0, box.height - POPOVER_HEIGHT),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    grab.current = null;
    setDragging(false);
    ref.current?.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT,
        background: CARD_BG,
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 12px 32px oklch(0 0 0 / 0.45)",
        zIndex: 5,
        cursor: dragging ? "grabbing" : "grab",
        // Arrastar sobre texto selecionaria o texto junto.
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {!media ? (
        <div style={{ padding: 16, fontSize: 12, color: TEXT_MUTED_2 }}>Câmera não encontrada.</div>
      ) : media.source === "tapo" ? (
        <TapoVideoPlayer src={media.streamUrl} controlsOnHover />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- stream MJPEG multipart, não é asset estático otimizável
        <img
          src={media.streamUrl}
          alt={name}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}
        />
      )}

      <div
        data-no-drag
        onClick={onClose}
        title={`Fechar ${name}`}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "oklch(0.15 0.01 50 / 0.65)",
          color: "oklch(0.97 0 0)",
          fontSize: 15,
          cursor: "pointer",
          zIndex: 2,
        }}
      >
        ×
      </div>
    </div>
  );
}
