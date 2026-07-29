"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Plano B quando o vídeo não roda: a mesma técnica dos cards da página
 * Câmeras — um JPEG recarregado de tempos em tempos. Não é vídeo, mas mostra
 * o que está acontecendo, que é o ponto de olhar uma câmera.
 */
function SnapshotFallback({ snapshotUrl, alt }: { snapshotUrl: string; alt: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const separator = snapshotUrl.includes("?") ? "&" : "?";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- snapshot da câmera via proxy, não é asset estático otimizável
    <img
      src={`${snapshotUrl}${separator}t=${tick}`}
      alt={alt}
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}
    />
  );
}

/** Player de vídeo ao vivo (fMP4) das câmeras Tapo, com controles próprios —
 * volume, qualidade (HD/SD) e tela cheia. Sem play/pause: o stream é sempre
 * "ao vivo", pausar não faz sentido conceitual e a barra nativa do navegador
 * traria botões desnecessários para esse caso. */
export function TapoVideoPlayer({
  src,
  /** Sem isto, um aparelho que não toca o stream fica só com a mensagem de
   * erro. O Safari do iPhone é o caso concreto: engole o fMP4 contínuo que
   * Chrome e Firefox tocam sem reclamar. */
  snapshotUrl,
  name = "Câmera",
  /** Numa janelinha pequena a barra de controles cobre boa parte da imagem —
   * aí ela só aparece com o mouse em cima. No modal grande fica sempre visível. */
  controlsOnHover = false,
}: {
  src: string;
  snapshotUrl?: string;
  name?: string;
  controlsOnHover?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Começa mudo de propósito. Navegador nenhum deixa um vídeo COM som tocar
  // sozinho — no iOS é proibido sempre, e no Chrome depende de um histórico de
  // interação com o site. Sem isto o `play()` era recusado e sobrava um
  // retângulo preto, sem erro nenhum na tela. Tirar o mudo é um clique, e aí o
  // gesto do usuário libera o áudio.
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState<"sd" | "hd">("sd");
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** Nunca deixar o quadro preto sem explicação: o usuário precisa saber se
   * está conectando, se falhou ou se só falta tocar para liberar. */
  const [status, setStatus] = useState<"conectando" | "tocando" | "bloqueado">("conectando");
  /**
   * Falha de carregamento fica separada do status de propósito. Quando o
   * stream morre, o `play()` também é recusado — e as duas notícias chegam sem
   * ordem garantida. Num estado só, a recusa sobrescrevia o erro e a tela
   * pedia "toque para reproduzir" para um vídeo que nunca ia tocar.
   */
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const videoSrc = `${src}${src.includes("?") ? "&" : "?"}quality=${quality}`;
  const usingSnapshot = failed && Boolean(snapshotUrl);

  /** O `failed` normalmente é limpo pelo `loadstart`, mas em modo snapshot o
   * <video> nem está montado para disparar esse evento — então limpar aqui é o
   * que faz o player voltar a existir. */
  function retryVideo() {
    setFailed(false);
    setAttempt((n) => n + 1);
  }

  // O estado precisa vir do evento, não do clique: sair com ESC (ou pelo
  // controle do próprio navegador) também tem que atualizar o botão.
  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  /**
   * O `play()` recusado diz por quê, e a diferença importa para o usuário:
   * `NotAllowedError` é a política de autoplay (basta tocar), qualquer outra
   * é a fonte que não carregou (tocar não resolve, tem que tentar de novo).
   */
  const attemptPlay = useCallback(() => {
    videoRef.current
      ?.play()
      .catch((err: unknown) =>
        (err as Error)?.name === "NotAllowedError" ? setStatus("bloqueado") : setFailed(true),
      );
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Listener no elemento em vez da prop `onError` do React: o evento `error`
    // de mídia não borbulha e não chegava ao React — o vídeo morria e a tela
    // continuava pedindo "toque para reproduzir".
    const handleError = () => setFailed(true);
    video.addEventListener("error", handleError);
    // Chamar `.play()` na mão em vez de confiar só no atributo `autoPlay` é o
    // que permite capturar a recusa; quem volta o status para "conectando" é o
    // `loadstart` do próprio vídeo — de dentro do efeito seria cascata.
    attemptPlay();
    return () => video.removeEventListener("error", handleError);
  }, [videoSrc, attempt, attemptPlay]);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    // Tirar o mudo é um gesto do usuário: se o autoplay tinha sido barrado,
    // este é o momento em que o vídeo finalmente pode começar.
    if (!next) attemptPlay();
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setMuted(value === 0);
    if (value > 0) attemptPlay();
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
      {usingSnapshot ? (
        <SnapshotFallback snapshotUrl={snapshotUrl!} alt={name} />
      ) : (
        <video
          ref={videoRef}
          key={`${videoSrc}#${attempt}`}
          src={videoSrc}
          playsInline
          autoPlay
          muted={muted}
          onLoadStart={() => {
            setStatus("conectando");
            setFailed(false);
          }}
          onPlaying={() => setStatus("tocando")}
          // `contain` e não `cover`: as câmeras desenham data e nome nas bordas
          // do quadro, e cortar para preencher come justamente essas informações.
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}
        />
      )}

      {usingSnapshot && (
        <div
          data-no-drag
          onClick={(e) => {
            e.stopPropagation();
            retryVideo();
          }}
          title="Tentar o vídeo ao vivo de novo"
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "oklch(0.15 0.01 50 / 0.7)",
            color: "oklch(0.9 0.006 50)",
            fontSize: 10,
            padding: "4px 9px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          Sem vídeo neste aparelho · imagens
        </div>
      )}

      {!usingSnapshot && (failed || status !== "tocando") && (
        <div
          data-no-drag
          onClick={(e) => {
            e.stopPropagation();
            if (failed) retryVideo();
            else if (status === "bloqueado") attemptPlay();
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            textAlign: "center",
            padding: 12,
            background: "oklch(0 0 0 / 0.55)",
            color: "oklch(0.97 0 0)",
            fontSize: 12,
            lineHeight: 1.5,
            cursor: !failed && status === "conectando" ? "default" : "pointer",
          }}
        >
          {failed ? (
            <>
              <span>Não foi possível carregar o vídeo da câmera.</span>
              <span style={{ opacity: 0.75 }}>Toque para tentar de novo</span>
            </>
          ) : status === "bloqueado" ? (
            <span>Toque para reproduzir</span>
          ) : (
            <span>Conectando à câmera...</span>
          )}
        </div>
      )}
      {/* Volume, HD/SD e tela cheia não querem dizer nada para uma sequência de
          JPEGs — a barra sairia de cena inteira sem controlar coisa alguma. */}
      <div
        data-no-drag
        className={controlsOnHover ? "ldl-video-controls" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: usingSnapshot ? "none" : "flex",
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
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
