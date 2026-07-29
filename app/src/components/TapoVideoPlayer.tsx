"use client";

import { useEffect, useRef, useState } from "react";

const buttonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "oklch(0.97 0 0)",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  alignItems: "center",
};

const qualityButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: "1px solid oklch(0.97 0 0 / 0.4)",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 700,
};

function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z" />
      <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M19.8 12 22 9.8l-1.4-1.4L18.4 10.6 16.2 8.4 14.8 9.8 17 12l-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4z" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 9h2V5h4V3H4v6zm0 6v6h6v-2H6v-4H4zm16-6V3h-6v2h4v4h2zm-2 6v4h-4v2h6v-6h-2z" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4H8v4H4v2h6V4zm4 0v6h6V8h-4V4h-2zM4 14v2h4v4h2v-6H4zm10 0v6h2v-4h4v-2h-6z" />
    </svg>
  );
}

/** Player de vídeo ao vivo (fMP4) das câmeras Tapo, com controles próprios —
 * volume, qualidade (HD/SD) e tela cheia. Sem play/pause: o stream é sempre
 * "ao vivo", pausar não faz sentido conceitual e a barra nativa do navegador
 * traria botões desnecessários para esse caso. */
export function TapoVideoPlayer({
  src,
  /** Numa janelinha pequena a barra de controles cobre boa parte da imagem —
   * aí ela só aparece com o mouse em cima. No modal grande fica sempre visível. */
  controlsOnHover = false,
}: {
  src: string;
  controlsOnHover?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState<"sd" | "hd">("sd");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoSrc = `${src}${src.includes("?") ? "&" : "?"}quality=${quality}`;

  // O estado precisa vir do evento, não do clique: sair com ESC (ou pelo
  // controle do próprio navegador) também tem que atualizar o botão.
  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    // O atributo HTML `autoPlay` nem sempre dispara com áudio fora do gesto
    // do clique que abriu o modal — chamar .play() explicitamente aqui é
    // mais confiável (ainda dentro da janela de "ativação transiente" do
    // clique que montou este componente).
    videoRef.current?.play().catch(() => {});
  }, [videoSrc]);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setMuted(value === 0);
  }

  function toggleQuality() {
    setQuality((q) => (q === "sd" ? "hd" : "sd"));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  }

  return (
    <div
      ref={containerRef}
      className={controlsOnHover ? "ldl-video" : undefined}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        playsInline
        // `contain` e não `cover`: as câmeras desenham data e nome nas bordas
        // do quadro, e cortar para preencher come justamente essas informações.
        style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}
      />
      <div
        data-no-drag
        className={controlsOnHover ? "ldl-video-controls" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "oklch(0.15 0.01 50 / 0.65)",
          borderRadius: 999,
          padding: "6px 14px",
        }}
      >
        <button
          type="button"
          onClick={toggleMute}
          style={buttonStyle}
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolume}
          style={{ width: 70, flex: "0 0 auto", accentColor: "white" }}
        />
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={toggleQuality}
          style={qualityButtonStyle}
          aria-label="Alternar qualidade HD/SD"
        >
          {quality === "hd" ? "HD" : "SD"}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          style={buttonStyle}
          aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
}
