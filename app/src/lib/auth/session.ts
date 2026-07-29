/**
 * Sessão de login do LDL — senha única para a casa.
 *
 * Usa Web Crypto (e não `node:crypto`) porque este módulo é importado tanto
 * pelas rotas de API quanto pelo `proxy.ts`, que roda no runtime Edge.
 *
 * O token é `<validade>.<assinatura>`, assinado com a própria senha como
 * chave. Isso dá de graça uma propriedade útil: trocar a senha invalida todas
 * as sessões abertas.
 */

export const SESSION_COOKIE = "ldl_sessao";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Sem senha configurada o sistema fica aberto, como sempre foi — melhor que
 * trancar o morador para fora num deploy. A interface avisa quando é o caso. */
export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function base64url(bytes: ArrayBuffer): string {
  let text = "";
  const view = new Uint8Array(bytes);
  for (const byte of view) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

/** Comparação em tempo constante: um `===` vazaria, pelo tempo de resposta,
 * quantos caracteres iniciais estavam certos. */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${await sign(String(expiresAt), secret)}`;
}

export async function isSessionValid(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  return equalsConstantTime(signature, await sign(expiresAt, secret));
}

/** A senha é comparada pelo HMAC dela, não caractere a caractere. */
export async function isPasswordCorrect(attempt: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([sign(attempt, "ldl"), sign(secret, "ldl")]);
  return equalsConstantTime(a, b);
}
