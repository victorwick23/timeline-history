"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TimelineEvent } from "@/lib/validation";

type EventsResponse = { events: TimelineEvent[] };

export function AdminEventsList() {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/events", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
    const json = (await res.json()) as EventsResponse;
    setEvents(json.events);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const filtered = useMemo(() => {
    if (!events) return null;
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [events, query]);

  async function onDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(`Delete failed (${res.status})`);
      return;
    }
    await load();
    router.refresh();
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!filtered) {
    return (
      <div className="rounded-xl border border-paper-border bg-paper p-4 text-sm text-muted-ink">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-paper-border bg-paper p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <label className="text-xs font-medium text-muted-ink">
          Search
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title or description…"
          className="mt-1 w-full rounded-lg border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none ring-0 placeholder:text-muted-ink/70 focus:border-timeline-red/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-paper-border bg-paper p-6 text-sm text-muted-ink">
          No events yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-paper-border bg-paper shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="grid grid-cols-12 gap-2 border-b border-paper-border px-4 py-3 text-xs font-semibold text-muted-ink">
            <div className="col-span-3">When</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-3">Categories</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {filtered.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-12 gap-2 border-b border-paper-border px-4 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-3 text-muted-ink">
                {formatWhen(e)}
              </div>
              <div className="col-span-5 font-medium text-ink">{e.title}</div>
              <div className="col-span-3 text-xs text-muted-ink">
                {e.categories.join(", ") || "—"}
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <Link
                  href={`/admin/events/${e.id}`}
                  className="rounded-md border border-paper-border px-2 py-1 text-xs font-semibold text-ink hover:bg-cream"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  className="rounded-md border border-red-500/35 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatWhen(e: TimelineEvent): string {
  const start = formatDateParts(e.when.start);
  if (e.when.type === "point") return start;
  return `${start}–${formatDateParts(e.when.end)}`;
}

function formatDateParts(d: { year: number; month?: number; day?: number }): string {
  if (!d.month) return String(d.year);
  if (!d.day) return `${pad2(d.month)}/${d.year}`;
  return `${pad2(d.day)}/${pad2(d.month)}/${d.year}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
