import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Expected multipart form with a 'file' field" },
      { status: 400 },
    );
  }

  const original = file.name || "upload";
  const ext = path.extname(original).slice(0, 12) || guessExt(file.type) || "";
  const safeExt = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : "";
  const filename = `${randomUUID()}${safeExt}`;

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, filename), bytes);

  return NextResponse.json({ imagePath: `/uploads/${filename}` }, { status: 201 });
}

function guessExt(mime: string): string | null {
  if (!mime) return null;
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return null;
}

