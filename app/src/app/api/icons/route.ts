import { NextResponse } from "next/server";
import { listIcons, saveCustomIcon } from "@/lib/icons/store";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export async function GET() {
  try {
    const icons = await listIcons();
    return NextResponse.json(icons);
  } catch (err) {
    console.error("[api/icons] GET", err);
    return NextResponse.json({ error: "Could not list icons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Arquivo vazio ou maior que 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const icon = await saveCustomIcon(file.name, buffer);
    return NextResponse.json(icon);
  } catch (err) {
    console.error("[api/icons] POST", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
