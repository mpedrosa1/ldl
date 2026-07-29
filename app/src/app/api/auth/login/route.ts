import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isPasswordCorrect,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Atrasa a resposta de senha errada para não dar para varrer senhas rápido. */
const WRONG_PASSWORD_DELAY_MS = 700;

export async function POST(request: Request) {
  const secret = process.env.APP_PASSWORD;
  if (!secret) {
    return NextResponse.json(
      { error: "Nenhuma senha configurada no servidor (APP_PASSWORD)." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const attempt = body?.password ?? "";

  if (!(await isPasswordCorrect(attempt, secret))) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(secret),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // `Secure` só quando a origem já é HTTPS: marcá-lo no acesso por HTTP na
    // rede local faria o navegador descartar o cookie e o login nunca colaria.
    secure: new URL(request.url).protocol === "https:",
  });
  return response;
}
