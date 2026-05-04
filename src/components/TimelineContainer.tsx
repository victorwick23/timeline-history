"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
} from "react";
import type { TimelineEvent } from "@/lib/validation";
import {
  MARKER_TO_CARD_INSET_PX,
  TimelineEvent as TimelineEventNode,
} from "@/components/TimelineEvent";

type PlacedEvent = {
  kind: "event";
  event: TimelineEvent;
  leftPx: number;
  t: number;
};

type BrokenAxis = {
  id: string;
  x: number;
};

type ClusterItem = {
  isCluster: boolean;
  xPosition: number;
  events: PlacedEvent[];
  tMin: number;
  tMax: number;
};

const ZOOM_MAX = 50;

export function TimelineContainer({
  events,
  onSelectEvents,
}: {
  events: TimelineEvent[];
  onSelectEvents?: (events: TimelineEvent[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const centerTRef = useRef(0); // "effective time" under viewport center
  const prevLayoutKeyRef = useRef<string>("");
  const pendingSmoothCenterRef = useRef<{
    t: number;
  } | null>(null);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => sortableKey(a) - sortableKey(b));
  }, [events]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportWidth(el.clientWidth);
    });
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    const padLeftPx = 64;
    const axisY = 210;
    const h = 440;
    if (sorted.length === 0) {
      return {
        padLeftPx,
        axisY,
        heightPx: h,
        widthPx: 0,
        baseScalePxPerT: 1,
        tMax: 1,
        items: [] as PlacedEvent[],
        broken: [] as BrokenAxis[],
        axis: { left: 0, width: 0 },
      };
    }

    const years = sorted.map((e) => floatYearFromKey(sortableKey(e)));
    const yearMin = years[0];
    const yearMax = years[years.length - 1];

    // Gap compression ("dead space" removal):
    // capYears grows with zoom, gradually revealing true gaps.
    const tReveal = clamp((zoomLevel - 1) / 1.4, 0, 1);
    const capYears = lerp(12, 120, tReveal); // at zoom=1, gaps > ~12y compress heavily
    const brokenThreshold = capYears * 1.6;

    const effectiveGaps: number[] = [];
    const cumulativeT: number[] = [0];
    const brokenIdx: number[] = [];
    for (let i = 0; i < years.length - 1; i++) {
      const gap = Math.max(0.0001, years[i + 1] - years[i]);
      const eff = Math.min(gap, capYears);
      effectiveGaps.push(eff);
      cumulativeT.push(cumulativeT[cumulativeT.length - 1] + eff);
      if (gap >= brokenThreshold) brokenIdx.push(i);
    }
    const tMax = Math.max(1e-6, cumulativeT[cumulativeT.length - 1]);

    // Smart scale:
    // zoomLevel=1 fits all data points within the current viewport width.
    const usableViewport = Math.max(320, viewportWidth || 0);
    const baseScalePxPerT = (usableViewport - padLeftPx * 2) / tMax;
    const scalePxPerT = baseScalePxPerT * zoomLevel;

    const tToX = (t: number) => padLeftPx + t * scalePxPerT;
    const xFirst = tToX(0);
    const xLast = tToX(tMax);

    const items: PlacedEvent[] = sorted.map((event, idx) => ({
      kind: "event",
      event,
      leftPx: tToX(cumulativeT[idx]),
      t: cumulativeT[idx],
    }));

    const broken: BrokenAxis[] = brokenIdx.map((i) => {
      const a = cumulativeT[i];
      const b = cumulativeT[i + 1];
      return { id: `broken-${i}`, x: tToX((a + b) / 2) };
    });

    const widthPx = Math.ceil(padLeftPx * 2 + tMax * scalePxPerT);
    const axisPad = 22;
    return {
      padLeftPx,
      axisY,
      heightPx: h,
      widthPx: Math.max(usableViewport, widthPx),
      baseScalePxPerT,
      tMax,
      items,
      broken,
      axis: {
        left: Math.max(0, xFirst - axisPad),
        width: xLast - xFirst + axisPad * 2,
      },
    };
  }, [sorted, viewportWidth, zoomLevel]);

  const clusters = useMemo<ClusterItem[]>(() => {
    const CLUSTER_THRESHOLD_PX = 60;
    const input = layout.items;
    if (input.length === 0) return [];

    const out: ClusterItem[] = [];
    let current: {
      xSum: number;
      events: PlacedEvent[];
      tMin: number;
      tMax: number;
    } = {
      xSum: 0,
      events: [],
      tMin: Number.POSITIVE_INFINITY,
      tMax: Number.NEGATIVE_INFINITY,
    };

    const flush = () => {
      if (current.events.length === 0) return;
      const xPosition = current.xSum / current.events.length;
      out.push({
        isCluster: current.events.length > 1,
        xPosition,
        events: current.events,
        tMin: current.tMin,
        tMax: current.tMax,
      });
      current = {
        xSum: 0,
        events: [],
        tMin: Number.POSITIVE_INFINITY,
        tMax: Number.NEGATIVE_INFINITY,
      };
    };

    for (const ev of input) {
      if (current.events.length === 0) {
        current.events.push(ev);
        current.xSum += ev.leftPx;
        current.tMin = Math.min(current.tMin, ev.t);
        current.tMax = Math.max(current.tMax, ev.t);
        continue;
      }
      const currentCenter = current.xSum / current.events.length;
      if (Math.abs(ev.leftPx - currentCenter) <= CLUSTER_THRESHOLD_PX) {
        current.events.push(ev);
        current.xSum += ev.leftPx;
        current.tMin = Math.min(current.tMin, ev.t);
        current.tMax = Math.max(current.tMax, ev.t);
      } else {
        flush();
        current.events.push(ev);
        current.xSum += ev.leftPx;
        current.tMin = Math.min(current.tMin, ev.t);
        current.tMax = Math.max(current.tMax, ev.t);
      }
    }
    flush();

    return out;
  }, [layout.items, zoomLevel, viewportWidth]);

  // Maintain the "viewed" position while zooming/resizing by keeping centerT stable.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const layoutKey = `${viewportWidth}:${zoomLevel}:${layout.widthPx}`;
    if (prevLayoutKeyRef.current === layoutKey) return;
    prevLayoutKeyRef.current = layoutKey;

    const pending = pendingSmoothCenterRef.current;
    if (pending) {
      const nextCenterPx =
        layout.padLeftPx + pending.t * layout.baseScalePxPerT * zoomLevel;
      el.scrollTo({
        left: Math.max(0, nextCenterPx - el.clientWidth / 2),
        behavior: "smooth",
      });
      pendingSmoothCenterRef.current = null;
      return;
    }

    const nextCenterPx =
      layout.padLeftPx +
      centerTRef.current * layout.baseScalePxPerT * zoomLevel;
    el.scrollLeft = Math.max(0, nextCenterPx - el.clientWidth / 2);
  }, [
    layout.baseScalePxPerT,
    layout.padLeftPx,
    layout.widthPx,
    viewportWidth,
    zoomLevel,
  ]);

  // Drag-to-pan for desktop trackpads/mice.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // let native swipe scroll
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-pan-exempt="true"]')) return;
      isDown = true;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.classList.add("cursor-grabbing");
      el.classList.remove("cursor-grab");
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      el.scrollLeft = startScrollLeft - dx;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      el.classList.remove("cursor-grabbing");
      el.classList.add("cursor-grab");
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    el.classList.add("cursor-grab");

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const onZoom = (next: number) => {
    setZoomLevel(clamp(next, 0.25, ZOOM_MAX));
  };

  const zoomToCluster = (c: ClusterItem) => {
    const t = (c.tMin + c.tMax) / 2;
    centerTRef.current = t;
    const nextZoom = clamp(zoomLevel * 4, 0.25, ZOOM_MAX);
    pendingSmoothCenterRef.current = { t };
    setZoomLevel(nextZoom);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const centerPx = el.scrollLeft + el.clientWidth / 2;
        const t =
          (centerPx - layout.padLeftPx) / (layout.baseScalePxPerT * zoomLevel);
        centerTRef.current = clamp(t, 0, layout.tMax);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [layout.baseScalePxPerT, layout.padLeftPx, layout.tMax, zoomLevel]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-paper-border bg-paper p-6 text-sm text-muted-ink">
        No events yet.
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-paper-border bg-paper shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">
            Interactive timelinesss
          </div>
          <div className="mt-0.5 text-xs text-muted-ink">
            Drag to pan. Use the controls to zoom.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoom(zoomLevel - 0.2)}
            className="rounded-full border border-paper-border bg-background px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
            aria-label="Zoom out"
          >
            −
          </button>
          <div className="min-w-[120px] text-center text-xs font-medium text-muted-ink">
            Zoom {Math.round(zoomLevel * 100)}%
          </div>
          <button
            type="button"
            onClick={() => onZoom(zoomLevel + 0.2)}
            className="rounded-full border border-paper-border bg-background px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              const el = scrollRef.current;
              if (el) el.scrollTo({ left: 0, behavior: "smooth" });
            }}
            className="ml-1 rounded-full border border-paper-border bg-background px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
          >
            Fit to screen
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              centerTRef.current = 0;
              const el = scrollRef.current;
              if (el) el.scrollTo({ left: 0, behavior: "smooth" });
            }}
            className="ml-1 rounded-full border border-paper-border bg-background px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-cream"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative overflow-x-auto overscroll-x-contain px-3 pb-6"
      >
        <div
          className="relative"
          style={{ width: layout.widthPx, height: layout.heightPx }}
          aria-label="Timeline canvas"
        >
          {/* axis */}
          <div
            className="absolute h-[2px] bg-timeline-red/80"
            style={{
              top: layout.axisY,
              left: layout.axis.left,
              width: layout.axis.width,
            }}
          />

          {layout.broken.map((b) => (
            <BrokenAxisMark key={b.id} x={b.x} y={layout.axisY} />
          ))}

          {clusters.map((c, idx) => {
            const variant = idx % 2 === 0 ? "top" : "bottom";
            const markerCardAlign = idx === 0 ? "leading" : "center";
            if (c.isCluster) {
              const clusterEvents = c.events.map((pe) => pe.event);
              const isSameYearCluster =
                clusterEvents.length > 0 &&
                clusterEvents.every(
                  (e) => e.when.start.year === clusterEvents[0].when.start.year,
                );
              const clusterOpensSidebar =
                isSameYearCluster || zoomLevel >= ZOOM_MAX;
              return (
                <ClusterBubble
                  key={`cluster-${idx}-${c.events[0]?.event.id ?? "x"}`}
                  x={c.xPosition}
                  axisY={layout.axisY}
                  variant={variant}
                  markerCardAlign={markerCardAlign}
                  yearLabel={clusterYearLabel(c)}
                  events={c.events}
                  mode={clusterOpensSidebar ? "details" : "zoom"}
                  onClick={() => {
                    if (clusterOpensSidebar) {
                      onSelectEvents?.(clusterEvents);
                    } else {
                      zoomToCluster(c);
                    }
                  }}
                />
              );
            }
            const single = c.events[0];
            return (
              <TimelineEventNode
                key={single.event.id}
                event={single.event}
                leftPx={single.leftPx}
                axisY={layout.axisY}
                variant={variant}
                markerCardAlign={markerCardAlign}
                zoomLevel={zoomLevel}
                onSelect={
                  onSelectEvents ? (ev) => onSelectEvents([ev]) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <p className="border-t border-paper-border px-5 pb-3 pt-3 text-[11px] leading-relaxed text-muted-ink">
        <span className="font-semibold text-ink">Penafian:</span>{" "}
        Seluruh informasi pada garis waktu ini dapat diubah sewaktu-waktu dan
        mungkin mengandung ketidakakuratan. Untuk koreksi atau penyuntingan,
        silakan hubungi{" "}
        <a
          href="mailto:victor@paroin.id"
          className="font-medium text-ink underline decoration-paper-border underline-offset-2 hover:text-timeline-red"
        >
          victor@paroin.id
        </a>
        .
      </p>
      <p className="px-5 pb-5 text-center text-[11px] text-muted-ink">
        © {new Date().getFullYear()} by victorwick
      </p>
    </section>
  );
}

function sortableKey(e: TimelineEvent): number {
  const m = e.when.start.month ?? 1;
  const d = e.when.start.day ?? 1;
  return e.when.start.year * 10000 + m * 100 + d;
}

function floatYearFromKey(key: number): number {
  const year = Math.floor(key / 10000);
  const mmdd = key % 10000;
  const month = Math.floor(mmdd / 100);
  const day = mmdd % 100;
  // month/day are optional in data, but our key normalizes missing to 1/1.
  const monthFrac = (Math.max(1, month) - 1) / 12;
  const dayFrac = (Math.max(1, day) - 1) / 365;
  return year + monthFrac + dayFrac;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function BrokenAxisMark({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="10"
        viewBox="0 0 18 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 6.2 5 2.2l4 4 4-4 4 4"
          stroke="rgba(124, 131, 253, 0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ClusterBubble({
  x,
  axisY,
  variant,
  markerCardAlign,
  yearLabel,
  events,
  mode,
  onClick,
}: {
  x: number;
  axisY: number;
  variant: "top" | "bottom";
  markerCardAlign: "center" | "leading";
  yearLabel: string;
  events: PlacedEvent[];
  mode: "zoom" | "details";
  onClick: () => void;
}) {
  const y = variant === "top" ? axisY - 120 : axisY + 34;
  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  const listSource = mode === "details" ? events.slice(0, 3) : events;
  const ariaLabel =
    mode === "details"
      ? `Cluster ${yearLabel}, ${events.length} events. Open details.`
      : `Cluster ${yearLabel}. Click to zoom in.`;
  return (
    <div
      className="absolute cursor-pointer select-none"
      style={{ left: x, top: 0 }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-pan-exempt="true"
      aria-label={ariaLabel}
    >
      <div
        className="absolute left-1/2 w-px -translate-x-1/2 bg-paper-border"
        style={{
          top: variant === "top" ? y + 70 : axisY,
          height: variant === "top" ? axisY - (y + 70) : y - axisY,
        }}
        aria-hidden="true"
      />

      <div
        className="absolute rounded-2xl border border-paper-border bg-event-panel px-3 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-cream"
        style={{
          top: y,
          left: "50%",
          width: 260,
          transform:
            markerCardAlign === "leading"
              ? `translateX(${MARKER_TO_CARD_INSET_PX}px)`
              : "translateX(-50%)",
        }}
      >
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-ink">{yearLabel}</div>
          <div className="text-[11px] font-semibold text-muted-ink">
            {events.length} item{events.length === 1 ? "" : "s"}
          </div>
        </div>
        <ul className="mt-1 max-h-28 space-y-1 overflow-auto pr-1 text-xs text-muted-ink">
          {listSource.map((e) => (
            <li
              key={e.event.id}
              className={[
                "leading-snug",
                mode === "details" ? "truncate" : "",
              ].join(" ")}
            >
              {mode === "details" ? "– " : null}
              {e.event.title}
            </li>
          ))}
        </ul>
        {mode === "zoom" ? (
          <div className="mt-2 text-[11px] font-semibold text-timeline-red/90">
            Click to zoom in
          </div>
        ) : null}
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: axisY }}
      >
        <div
          className="relative -translate-x-1/2 -translate-y-1/2 rounded-full bg-timeline-red px-3 py-1 text-[11px] font-bold text-white shadow-sm w-max"
          aria-hidden="true"
        >
          {yearLabel}
        </div>
      </div>
    </div>
  );
}

function clusterYearLabel(c: ClusterItem): string {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const e of c.events) {
    const y = e.event.when.start.year;
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "—";
  return min === max ? String(min) : `${min}–${max}`;
}
