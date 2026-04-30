import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  EventsFileSchema,
  EventSchema,
  type TimelineEvent,
  toSortableNumber,
} from "@/lib/validation";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");

let writeChain: Promise<void> = Promise.resolve();

async function ensureEventsFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_PATH);
  } catch {
    await fs.writeFile(EVENTS_PATH, "[]\n", "utf8");
  }
}

async function readRaw(): Promise<unknown> {
  await ensureEventsFile();
  const txt = await fs.readFile(EVENTS_PATH, "utf8");
  return JSON.parse(txt || "[]");
}

async function writeRaw(events: TimelineEvent[]): Promise<void> {
  await ensureEventsFile();
  const pretty = JSON.stringify(events, null, 2) + "\n";
  await fs.writeFile(EVENTS_PATH, pretty, "utf8");
}

export async function listEvents(): Promise<TimelineEvent[]> {
  const raw = await readRaw();
  const events = EventsFileSchema.parse(raw);
  return events.sort(
    (a, b) => toSortableNumber(a.when.start) - toSortableNumber(b.when.start),
  );
}

export async function getEvent(id: string): Promise<TimelineEvent | null> {
  const events = await listEvents();
  return events.find((e) => e.id === id) ?? null;
}

export async function createEvent(
  input: Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">,
): Promise<TimelineEvent> {
  const now = new Date().toISOString();
  const created: TimelineEvent = EventSchema.parse({
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  });

  await enqueueWrite(async () => {
    const current = EventsFileSchema.parse(await readRaw());
    current.push(created);
    await writeRaw(current);
  });

  return created;
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">>,
): Promise<TimelineEvent | null> {
  let updated: TimelineEvent | null = null;
  const now = new Date().toISOString();

  await enqueueWrite(async () => {
    const current = EventsFileSchema.parse(await readRaw());
    const idx = current.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const next = EventSchema.parse({
      ...current[idx],
      ...patch,
      id,
      updatedAt: now,
    });
    current[idx] = next;
    await writeRaw(current);
    updated = next;
  });

  return updated;
}

export async function deleteEvent(id: string): Promise<boolean> {
  let deleted = false;

  await enqueueWrite(async () => {
    const current = EventsFileSchema.parse(await readRaw());
    const next = current.filter((e) => e.id !== id);
    deleted = next.length !== current.length;
    if (deleted) await writeRaw(next);
  });

  return deleted;
}

function enqueueWrite(fn: () => Promise<void>): Promise<void> {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

