import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { TapoCamera } from "./store";

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const RW_TIMEOUT_US = 5_000_000; // 5s socket/read timeout, in microseconds (ffmpeg rtsp demuxer's -timeout option)
const SNAPSHOT_HARD_TIMEOUT_MS = 10_000;

export function buildRtspUrl(camera: Pick<TapoCamera, "host" | "username" | "password" | "streamPath">): string {
  const auth = `${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}`;
  return `rtsp://${auth}@${camera.host}:554/${camera.streamPath}`;
}

/** Grabs a single JPEG frame from an RTSP stream via ffmpeg (no persistent process). */
export function captureSnapshot(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, [
      "-rtsp_transport", "tcp",
      "-timeout", String(RW_TIMEOUT_US),
      "-i", rtspUrl,
      "-frames:v", "1",
      "-q:v", "3",
      "-f", "mjpeg",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Tempo esgotado ao capturar snapshot da câmera"));
    }, SNAPSHOT_HARD_TIMEOUT_MS);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-500)}`));
      }
    });
  });
}

/**
 * Spawns a long-running ffmpeg process that emits a continuous fragmented-MP4
 * stream (video + audio) playable directly by a <video> element. Video is
 * copied as-is (no re-encode — Tapo's H.264 is already browser-native, and
 * copying keeps CPU usage on the NAS minimal), audio is transcoded to AAC
 * since browsers can't play the camera's raw PCM (G.711) in an MP4 container.
 * `-map 0:a:0?` makes the audio track optional in case a camera has none.
 * Caller is responsible for killing the process (e.g. on client disconnect).
 */
export function spawnFmp4Stream(rtspUrl: string): ChildProcessWithoutNullStreams {
  return spawn(FFMPEG_BIN, [
    "-rtsp_transport", "tcp",
    "-timeout", String(RW_TIMEOUT_US),
    "-i", rtspUrl,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "64k",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-reset_timestamps", "1",
    "pipe:1",
  ]);
}
