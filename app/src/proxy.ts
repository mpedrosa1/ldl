import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isSessionValid } from "@/lib/auth/session";

/**
 * Porteiro do LDL: sem sessão válida, nada além da tela de login responde.
 *
 * Em Next 16 a convenção `middleware.ts` foi renomeada para `proxy.ts`.
 *
 * Sem `APP_PASSWORD` definido o sistema segue aberto, como sempre foi — é
 * proposital, para um deploy não trancar o morador para fora de casa.
 */

/** Precisam responder deslogado: a própria tela de login, o endpoint que
 * autentica, e os arquivos que fazem o app instalável funcionar. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/favicon.ico",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Assets do Next e ícones do PWA: bloqueá-los deixaria a tela de login sem
  // estilo e o ícone do app quebrado.
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/icon-") || pathname === "/apple-touch-icon.png") return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const secret = process.env.APP_PASSWORD;
  if (!secret) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value, secret)) {
    return NextResponse.next();
  }

  // A API responde 401 em vez de redirecionar: um fetch que recebe HTML de
  // login no lugar de JSON quebra de um jeito difícil de diagnosticar.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  // Guarda para onde a pessoa ia, para voltar lá depois de entrar.
  if (pathname !== "/") login.searchParams.set("de", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
