import { readFile } from "node:fs/promises";
import { mimeFor, resolveCustomIconPath } from "@/lib/icons/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  try {
    const filePath = resolveCustomIconPath(filename);
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeFor(filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
