"use client";

import Image from "next/image";
import type { TimelineEvent } from "@/lib/validation";

export function EventDetailSidebar({
  selectedEvents,
  onClose,
  onSelectSingle,
}: {
  selectedEvents: TimelineEvent[] | null;
  onClose: () => void;
  onSelectSingle: (event: TimelineEvent) => void;
}) {
  const open = selectedEvents !== null && selectedEvents.length > 0;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close details"
          className="fixed inset-0 z-40 bg-background/75 transition-opacity duration-300"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={[
          "fixed top-0 right-0 z-50 h-full w-96 max-w-[100vw] bg-paper shadow-[0_0_48px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-out",
          open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none",
          "flex flex-col border-l border-paper-border",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-paper-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-paper-border text-ink hover:bg-cream hover:border-paper-border"
            aria-label="Close"
          >
            <span className="text-lg leading-none" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">
          {!open || !selectedEvents ? null : selectedEvents.length === 1 ? (
            <SingleEventView event={selectedEvents[0]} />
          ) : (
            <MultiEventListView
              events={selectedEvents}
              onPick={onSelectSingle}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function SingleEventView({ event }: { event: TimelineEvent }) {
  return (
    <div className="space-y-4">
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-paper-border bg-background">
        {event.imagePath ? (
          <Image
            src={event.imagePath}
            alt={event.title}
            fill
            className="object-cover grayscale"
            sizes="384px"
            priority
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-cream text-sm text-muted-ink">
            No image
          </div>
        )}
      </div>
      <div className="text-xs font-semibold tracking-wide text-timeline-red">
        {formatWhen(event)}
      </div>
      <h2 className="text-xl font-semibold leading-tight text-ink">
        {event.title}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-ink">
        {event.description}
      </p>
      {event.categories.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {event.categories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-paper-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-ink"
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MultiEventListView({
  events,
  onPick,
}: {
  events: TimelineEvent[];
  onPick: (event: TimelineEvent) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-ink">
        Multiple events in this period. Choose one for full details.
      </p>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => onPick(ev)}
              className="w-full rounded-2xl border border-paper-border bg-background p-3 text-left shadow-sm transition-colors hover:bg-cream"
            >
              <div className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-paper-border bg-background">
                  {ev.imagePath ? (
                    <Image
                      src={ev.imagePath}
                      alt=""
                      fill
                      className="object-cover grayscale"
                      sizes="56px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-muted-ink">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-timeline-red">
                    {formatWhen(ev)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
                    {ev.title}
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatWhen(event: TimelineEvent): string {
  const start = formatDateParts(event.when.start);
  if (event.when.type === "point") return start;
  return `${start}–${formatDateParts(event.when.end)}`;
}

function formatDateParts(d: {
  year: number;
  month?: number;
  day?: number;
}): string {
  if (!d.month) return String(d.year);
  if (!d.day) return `${pad2(d.month)}/${d.year}`;
  return `${pad2(d.day)}/${pad2(d.month)}/${d.year}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
