"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { TimelineEvent as TimelineEventType } from "@/lib/validation";

export type TimelineEventVariant = "top" | "bottom";

/** `leading`: card starts to the right of the marker (avoids clipping the first item at the scroll edge). */
export type MarkerCardAlign = "center" | "leading";

/** Timeline node is 36×36px (`w-9`); nudge card so its left edge clears the dot. */
export const MARKER_TO_CARD_INSET_PX = 18 + 8;

export function TimelineEvent({
  event,
  variant,
  leftPx,
  axisY,
  zoomLevel,
  markerCardAlign = "center",
  onSelect,
}: {
  event: TimelineEventType;
  variant: TimelineEventVariant;
  leftPx: number;
  axisY: number;
  zoomLevel: number;
  markerCardAlign?: MarkerCardAlign;
  onSelect?: (event: TimelineEventType) => void;
}) {
  // Keep timeline readable at default zoom (1.0) by showing event cards.
  // Reserve the "dots + year only" view for clearly zoomed-out states.
  const lodMinimal = zoomLevel < 0.9;
  const compact = zoomLevel < 1.5;
  const y = variant === "top" ? axisY - (compact ? 92 : 170) : axisY + 26;
  const accent = categoryAccent(event.categories);
  const dateLabel = formatWhen(event);

  if (lodMinimal) {
    const labelY = variant === "top" ? axisY - 42 : axisY + 18;
    return (
      <div className="absolute" style={{ left: leftPx, top: 0 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: axisY - 14 }}
        >
          <div className="relative h-7 w-7">
            <div className="absolute inset-0 rounded-full bg-timeline-red/18" />
            <div className="absolute inset-[6px] rounded-full bg-paper border border-paper-border shadow-sm" />
            <div
              className="absolute inset-[8px] rounded-full"
              style={{ backgroundColor: accent.node }}
              aria-hidden="true"
            />
          </div>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-timeline-red"
          style={{ top: labelY }}
        >
          {event.when.start.year}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute" style={{ left: leftPx, top: 0 }}>
      {/* connector */}
      <div
        className="absolute left-1/2 w-px -translate-x-1/2 bg-paper-border"
        style={{
          top: variant === "top" ? y + 136 : axisY,
          height: variant === "top" ? axisY - (y + 136) : y - axisY,
        }}
      />

      {/* node */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: axisY - 18 }}
      >
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-full bg-timeline-red/20" />
          <div className="absolute inset-[7px] rounded-full bg-paper border border-paper-border shadow-sm" />
          <div
            className="absolute inset-[9px] rounded-full"
            style={{ backgroundColor: accent.node }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* content */}
      <div
        className={[
          "absolute rounded-2xl border bg-event-panel shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-[opacity,transform,width] duration-200",
          "border-paper-border",
          onSelect ? "cursor-pointer" : "",
        ].join(" ")}
        style={{
          top: y,
          left: "50%",
          width: compact ? 210 : 260,
          opacity: compact ? 0.92 : 1,
          transform:
            markerCardAlign === "leading"
              ? `translateX(${MARKER_TO_CARD_INSET_PX}px) translateY(${compact ? 6 : 0}px)`
              : `translateX(-50%) translateY(${compact ? 6 : 0}px)`,
          padding: compact ? "12px 12px" : "16px 16px",
        }}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        data-pan-exempt={onSelect ? "true" : undefined}
        onClick={
          onSelect
            ? (e) => {
                e.stopPropagation();
                onSelect(event);
              }
            : undefined
        }
        onKeyDown={
          onSelect
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(event);
                }
              }
            : undefined
        }
      >
        <div className="flex items-start gap-3">
          {!compact ? (
            <div className="relative shrink-0">
              <div
                className="absolute -inset-2 rounded-full bg-timeline-red/20"
                aria-hidden="true"
              />
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-paper-border bg-background">
                {event.imagePath ? (
                  <Image
                    src={event.imagePath}
                    alt={event.title}
                    fill
                    className="object-cover grayscale"
                    sizes="56px"
                  />
                ) : (
                  <NoPhotoArt />
                )}
              </div>
              {accent.icon ? (
                <div
                  className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-paper-border bg-paper shadow-sm"
                  title={accent.label}
                  aria-label={accent.label}
                >
                  {accent.icon}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-timeline-red">
              {dateLabel}
            </div>
            <div className="mt-1 text-[15px] font-semibold leading-5 text-ink">
              {event.title}
            </div>
            {!compact ? (
              <div className="mt-2 line-clamp-3 text-sm leading-5 text-muted-ink">
                {event.description}
              </div>
            ) : null}
          </div>
        </div>

        {!compact && event.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {event.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-full border border-paper-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-ink"
              >
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NoPhotoArt() {
  return (
    <div className="grid h-full w-full place-items-center bg-background">
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M9 28c7-10 16-8 26-18"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M26.5 10.3c2.5-.4 5.2.6 7 2.4"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M17 32c1.5-2.7 4.4-4.2 7.5-4.1"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M28.2 28.2l4.7 4.7"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M32.9 28.2l-4.7 4.7"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function formatWhen(event: TimelineEventType): string {
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

function categoryAccent(categories: string[]): {
  label: string;
  node: string;
  icon: ReactNode | null;
} {
  const set = new Set(categories);
  if (set.has("war")) {
    return { label: "War", node: "#94a3b8", icon: <IconSword /> };
  }
  if (set.has("religion-figure")) {
    return { label: "Religion figure", node: "#a78bfa", icon: <IconHalo /> };
  }
  if (set.has("public-figure")) {
    return { label: "Public figure", node: "#7c83fd", icon: <IconStar /> };
  }
  return { label: "Event", node: "#64748b", icon: null };
}

function IconStar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3l2.7 6.2 6.7.6-5 4.3 1.5 6.5L12 17.8 6.1 20.6l1.5-6.5-5-4.3 6.7-.6L12 3Z"
        fill="#7c83fd"
      />
    </svg>
  );
}

function IconSword() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 4l-7.6 7.6-2 6.4-2.8-2.8 6.4-2L20 4Z"
        fill="#cbd5e1"
      />
      <path
        d="M6.2 13.8 3 17l4 4 3.2-3.2-4-4Z"
        fill="#cbd5e1"
        opacity=".75"
      />
    </svg>
  );
}

function IconHalo() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 4c-4.4 0-8 1.8-8 4s3.6 4 8 4 8-1.8 8-4-3.6-4-8-4Z"
        fill="#a78bfa"
        opacity=".25"
      />
      <path
        d="M12 10c-3.3 0-6-.9-6-2s2.7-2 6-2 6 .9 6 2-2.7 2-6 2Z"
        stroke="#a78bfa"
        strokeWidth="1.6"
      />
      <path
        d="M12 21a5.2 5.2 0 1 0 0-10.4A5.2 5.2 0 0 0 12 21Z"
        stroke="#a78bfa"
        strokeWidth="1.6"
      />
    </svg>
  );
}

