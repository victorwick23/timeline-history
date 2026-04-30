import Image from "next/image";
import type { TimelineEvent } from "@/lib/validation";

export function TimelineEventCard({ event }: { event: TimelineEvent }) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-[9px] top-5 h-3 w-3 rounded-full border border-paper-border bg-paper" />
      <div className="rounded-xl border border-paper-border bg-paper p-4 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-timeline-red">
              {formatWhen(event)}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-ink">
              {event.title}
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-ink">
              {event.description}
            </div>
            {event.categories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-paper-border bg-background px-2 py-0.5 text-xs font-medium text-muted-ink"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {event.imagePath ? (
            <div className="relative h-24 w-full overflow-hidden rounded-lg border border-paper-border bg-background sm:h-24 sm:w-40">
              <Image
                src={event.imagePath}
                alt={event.title}
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatWhen(event: TimelineEvent): string {
  const start = formatDateParts(event.when.start);
  if (event.when.type === "point") return start;
  return `${start}–${formatDateParts(event.when.end)}`;
}

function formatDateParts(d: { year: number; month?: number; day?: number }): string {
  if (!d.month) return String(d.year);
  if (!d.day) return `${pad2(d.month)}/${d.year}`;
  return `${pad2(d.day)}/${pad2(d.month)}/${d.year}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
