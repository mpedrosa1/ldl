import crypto from "node:crypto";
import https from "node:https";
import type { TapoCamera } from "./store";

/**
 * Cliente da API HTTPS local das câmeras Tapo — usada para o que o RTSP não
 * cobre (hoje: modo privacidade / "lens mask"). O firmware atual exige o login
 * seguro (`encrypt_type: 3`): dois round-trips de handshake, e depois todo
 * request vai criptografado em AES-128-CBC dentro de um envelope
 * `securePassthrough`, assinado no header `Tapo_tag`.
 *
 * Protocolo replicado do pytapo (github.com/JurajNyiri/pytapo), que é a
 * referência de engenharia reversa desse protocolo.
 */

const BASE_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "User-Agent": "Tapo CameraClient Android",
  requestByApp: "true",
  "Content-Type": "application/json; charset=UTF-8",
};

const REQUEST_TIMEOUT_MS = 8000;

const sha256Hex = (input: string) =>
  crypto.createHash("sha256").update(input).digest("hex").toUpperCase();
const md5Hex = (input: string) =>
  crypto.createHash("md5").update(input).digest("hex").toUpperCase();

interface Session {
  stok: string;
  seq: number;
  lsk: Buffer;
  ivb: Buffer;
  /** Senha já hasheada, no algoritmo que a câmera aceitou (sha256 ou md5). */
  hashedPassword: string;
  cnonce: string;
}

/** Sessões vivem pouco: o handshake é barato e evita lidar com expiração. */
const sessions = new Map<string, { session: Session; expiresAt: number }>();
const SESSION_TTL_MS = 60_000;

/**
 * Usa `node:https` em vez de `fetch` de propósito: as câmeras servem um
 * certificado self-signed, e o `fetch` do Node (undici) não aceita um agent
 * customizado — a única alternativa seria desligar a validação de TLS do
 * processo inteiro, o que afetaria também as chamadas ao Home Assistant.
 */
function postJson(
  host: string,
  path: string,
  body: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        port: 443,
        // Caminho passado cru de propósito: o `stok` devolvido pela câmera tem
        // caracteres como `!`, `~` e `*`, e normalizar a URL poderia
        // percent-encodá-los e invalidar a sessão.
        path,
        method: "POST",
        rejectUnauthorized: false,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          ...BASE_HEADERS,
          Host: host,
          Referer: `https://${host}`,
          "Content-Length": Buffer.byteLength(body),
          ...extraHeaders,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("A câmera não respondeu a tempo"));
    });
    req.end(body);
  });
}

async function login(camera: TapoCamera): Promise<Session> {
  const cnonce = crypto.randomBytes(4).toString("hex").toUpperCase();

  const step1 = JSON.parse(
    await postJson(
      camera.host,
      "/",
      JSON.stringify({ method: "login", params: { cnonce, encrypt_type: "3", username: "admin" } }),
    ),
  );
  const nonce: string | undefined = step1?.result?.data?.nonce;
  const deviceConfirm: string | undefined = step1?.result?.data?.device_confirm;
  if (!nonce || !deviceConfirm) {
    throw new Error("A câmera não respondeu ao handshake de login");
  }

  // O device_confirm prova que a câmera conhece a senha, e revela qual
  // algoritmo de hash esse firmware usa.
  const candidates = [sha256Hex(camera.password), md5Hex(camera.password)];
  const hashedPassword = candidates.find(
    (candidate) => deviceConfirm === sha256Hex(cnonce + candidate + nonce) + nonce + cnonce,
  );
  if (!hashedPassword) {
    throw new Error("Usuário ou senha da câmera incorretos");
  }

  const digestPasswd = sha256Hex(hashedPassword + cnonce + nonce) + cnonce + nonce;
  const step2 = JSON.parse(
    await postJson(
      camera.host,
      "/",
      JSON.stringify({
        method: "login",
        params: { cnonce, encrypt_type: "3", digest_passwd: digestPasswd, username: "admin" },
      }),
    ),
  );
  const stok: string | undefined = step2?.result?.stok;
  const startSeq: number | undefined = step2?.result?.start_seq;
  if (!stok || startSeq == null) {
    throw new Error("A câmera recusou o login (sem stok)");
  }

  const hashedKey = sha256Hex(cnonce + hashedPassword + nonce);
  const token = (kind: string) =>
    crypto.createHash("sha256").update(kind + cnonce + nonce + hashedKey).digest().subarray(0, 16);

  return {
    stok,
    // A câmera consome um número de sequência durante o próprio handshake, então
    // o primeiro request útil já começa adiante — o retry em `execute` cobre o
    // ajuste fino caso o firmware conte diferente.
    seq: startSeq + 1,
    lsk: token("lsk"),
    ivb: token("ivb"),
    hashedPassword,
    cnonce,
  };
}

async function getSession(camera: TapoCamera, forceNew: boolean): Promise<Session> {
  const cached = sessions.get(camera.id);
  if (!forceNew && cached && cached.expiresAt > Date.now()) return cached.session;

  const session = await login(camera);
  sessions.set(camera.id, { session, expiresAt: Date.now() + SESSION_TTL_MS });
  return session;
}

interface TapoResponse {
  error_code?: number;
  result?: { responses?: { method: string; result?: unknown; error_code?: number }[] };
}

async function sendOnce(
  camera: TapoCamera,
  session: Session,
  method: string,
  params: unknown,
): Promise<TapoResponse> {
  const plain = JSON.stringify({
    method: "multipleRequest",
    params: { requests: [{ method, params }] },
  });

  const cipher = crypto.createCipheriv("aes-128-cbc", session.lsk, session.ivb);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
  const body = JSON.stringify({ method: "securePassthrough", params: { request: encrypted } });

  const seq = session.seq;
  session.seq += 1;
  const tag = sha256Hex(sha256Hex(session.hashedPassword + session.cnonce) + body + String(seq));

  const raw = await postJson(camera.host, `/stok=${session.stok}/ds`, body, {
    Seq: String(seq),
    Tapo_tag: tag,
  });

  const parsed = JSON.parse(raw);
  const response: string | undefined = parsed?.result?.response;
  if (!response) return parsed as TapoResponse;

  const decipher = crypto.createDecipheriv("aes-128-cbc", session.lsk, session.ivb);
  const plainResponse = Buffer.concat([
    decipher.update(Buffer.from(response, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plainResponse) as TapoResponse;
}

/**
 * A câmera valida o número de sequência de forma estrita e o incrementa mesmo
 * em requests que ela rejeita — na prática o primeiro request depois do login
 * costuma cair fora de sincronia. Reenviar (com o seq já incrementado, e no
 * limite refazendo o login) ressincroniza de forma determinística.
 */
async function executeUnlocked(
  camera: TapoCamera,
  method: string,
  params: unknown,
): Promise<unknown> {
  let lastError: number | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await getSession(camera, attempt === 2);
    const result = await sendOnce(camera, session, method, params);
    const inner = result.result?.responses?.[0];

    if (inner && inner.error_code === 0) return inner.result;

    lastError = inner?.error_code ?? result.error_code;
    if (attempt === 1) sessions.delete(camera.id);
  }

  throw new Error(`A câmera recusou "${method}" (código ${lastError})`);
}

/** Duas chamadas simultâneas na mesma câmera consumiriam o mesmo número de
 * sequência e ambas seriam recusadas — por isso cada câmera tem sua fila. */
const queues = new Map<string, Promise<unknown>>();

function execute(camera: TapoCamera, method: string, params: unknown): Promise<unknown> {
  const previous = queues.get(camera.id) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => executeUnlocked(camera, method, params));

  queues.set(
    camera.id,
    next.catch(() => {}),
  );
  return next;
}

export async function getPrivacyMode(camera: TapoCamera): Promise<boolean> {
  const result = (await execute(camera, "getLensMaskConfig", {
    lens_mask: { name: ["lens_mask_info"] },
  })) as { lens_mask?: { lens_mask_info?: { enabled?: string } } };

  return result?.lens_mask?.lens_mask_info?.enabled === "on";
}

export async function setPrivacyMode(camera: TapoCamera, enabled: boolean): Promise<void> {
  await execute(camera, "setLensMaskConfig", {
    lens_mask: { lens_mask_info: { enabled: enabled ? "on" : "off" } },
  });
}
