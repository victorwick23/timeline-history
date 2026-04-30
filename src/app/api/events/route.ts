import { NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/eventsStore";
import { CreateEventInputSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryCsv = url.searchParams.get("categories");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  let events = await listEvents();

  if (categoryCsv) {
    const selected = new Set(
      categoryCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    events = events.filter((e) => e.categories.some((c) => selected.has(c)));
  }

  if (q) {
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateEventInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const event = await createEvent(parsed.data);
  return NextResponse.json({ event }, { status: 201 });
}

