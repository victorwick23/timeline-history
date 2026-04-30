"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineEvent } from "@/lib/validation";
import { EventDetailSidebar } from "@/components/EventDetailSidebar";
import { TimelineEventCard } from "@/components/Timeline/TimelineEventCard";
import { TimelineContainer } from "@/components/TimelineContainer";

type EventsResponse = { events: TimelineEvent[] };

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<TimelineEvent[] | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
        const json = (await res.json()) as EventsResponse;
        if (!cancelled) setEvents(json.events);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    (events ?? []).forEach((e) => e.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const categoryFiltered = useMemo(() => {
    if (!events) return null;
    const selected = new Set(selectedCategories);
    const isAllCategories = selected.size === 0;

    return events.filter((e) => {
      if (!isAllCategories && !e.categories.some((c) => selected.has(c))) {
        return false;
      }
      return true;
    });
  }, [events, selectedCategories]);

  const suggestions = useMemo(() => {
    const base = categoryFiltered ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const already = new Set(selectedEventIds);
    return base
      .filter((e) => !already.has(e.id))
      .filter((e) => e.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [categoryFiltered, query, selectedEventIds]);

  const filtered = useMemo(() => {
    if (!categoryFiltered) return null;
    if (selectedEventIds.length === 0) return categoryFiltered;
    const selected = new Set(selectedEventIds);
    return categoryFiltered.filter((e) => selected.has(e.id));
  }, [categoryFiltered, selectedEventIds]);

  const addSelectedEvent = (ev: TimelineEvent) => {
    setSelectedEventIds((prev) =>
      prev.includes(ev.id) ? prev : [...prev, ev.id],
    );
    setQuery("");
  };

  const removeSelectedEvent = (id: string) => {
    setSelectedEventIds((prev) => prev.filter((x) => x !== id));
  };

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
        Loading timeline…
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6">
      <EventDetailSidebar
        selectedEvents={selectedEvents}
        onClose={() => setSelectedEvents(null)}
        onSelectSingle={(ev) => setSelectedEvents([ev])}
      />
      <div className="relative z-20 rounded-[28px] border border-paper-border bg-paper p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="text-xs font-semibold tracking-wide text-muted-ink">
              Search
            </label>
            <div className="relative mt-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0) {
                    e.preventDefault();
                    addSelectedEvent(suggestions[0]);
                  }
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Type a name…"
                className="w-full rounded-xl border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none ring-0 placeholder:text-muted-ink/70 focus:border-timeline-red/55 z-50"
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="timeline-search-suggestions"
                aria-autocomplete="list"
              />

              {suggestions.length > 0 ? (
                <div
                  id="timeline-search-suggestions"
                  role="listbox"
                  className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-paper-border bg-paper shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addSelectedEvent(s)}
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-cream"
                      role="option"
                      aria-selected="false"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedEventIds.length > 0 && events ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedEventIds.map((id) => {
                  const ev = events.find((x) => x.id === id);
                  if (!ev) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 rounded-full border border-paper-border bg-background px-3 py-1 text-xs font-semibold text-ink"
                    >
                      {ev.title}
                      <button
                        type="button"
                        onClick={() => removeSelectedEvent(id)}
                        className="rounded-full px-1 text-muted-ink hover:bg-cream"
                        aria-label={`Remove ${ev.title}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedEventIds([])}
                  className="rounded-full border border-paper-border bg-background px-3 py-1 text-xs font-semibold text-muted-ink hover:bg-cream"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="md:max-w-md">
            <div className="text-xs font-semibold tracking-wide text-muted-ink">
              Categories
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {allCategories.length === 0 ? (
                <span className="text-xs text-muted-ink">
                  No categories yet.
                </span>
              ) : (
                <>
                  <button
                    key="__all__"
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      selectedCategories.length === 0
                        ? "border-timeline-red bg-timeline-red text-white"
                        : "border-paper-border bg-background text-muted-ink hover:bg-cream",
                    ].join(" ")}
                  >
                    All
                  </button>
                  {allCategories.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setSelectedCategories((prev) =>
                            active
                              ? prev.filter((c) => c !== cat)
                              : [...prev, cat],
                          )
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          active
                            ? "border-timeline-red bg-timeline-red text-white"
                            : "border-paper-border bg-background text-muted-ink hover:bg-cream",
                        ].join(" ")}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-paper-border bg-paper p-6 text-sm text-muted-ink">
          No events match your filters yet.
        </div>
      ) : (
        <>
          <div className="relative z-0 hidden sm:block">
            <TimelineContainer
              events={filtered}
              onSelectEvents={setSelectedEvents}
            />
          </div>
          <div className="sm:hidden">
            <div className="relative">
              <div className="absolute left-3 top-0 h-full w-px bg-paper-border" />
              <div className="flex flex-col gap-4">
                {filtered.map((event) => (
                  <TimelineEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
