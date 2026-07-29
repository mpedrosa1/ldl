import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Diz à interface se existe senha configurada. Não expõe nada sensível: se
 * a proteção estiver desligada, isso já é evidente por não ter havido login. */
export async function GET() {
  return NextResponse.json({ enabled: isAuthEnabled() });
}
