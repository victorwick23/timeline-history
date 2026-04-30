"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateParts, TimelineEvent, When } from "@/lib/validation";

type Props =
  | { mode: "create" }
  | { mode: "edit"; id: string };

type EventsOneResponse = { event: TimelineEvent };

export function EventForm(props: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(props.mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");

  const [whenType, setWhenType] = useState<When["type"]>("point");
  const [startYear, setStartYear] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>("");
  const [startDay, setStartDay] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");
  const [endDay, setEndDay] = useState<string>("");

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const hydrate = useCallback((e: TimelineEvent) => {
    setTitle(e.title);
    setDescription(e.description);
    setCategories(e.categories ?? []);
    setImagePath(e.imagePath ?? null);
    setWhenType(e.when.type);

    setStartYear(String(e.when.start.year));
    setStartMonth(e.when.start.month ? String(e.when.start.month) : "");
    setStartDay(e.when.start.day ? String(e.when.start.day) : "");

    if (e.when.type === "range") {
      setEndYear(String(e.when.end.year));
      setEndMonth(e.when.end.month ? String(e.when.end.month) : "");
      setEndDay(e.when.end.day ? String(e.when.end.day) : "");
    } else {
      setEndYear("");
      setEndMonth("");
      setEndDay("");
    }
  }, []);

  const eventId = props.mode === "edit" ? props.id : null;

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load event (${res.status})`);
        const json = (await res.json()) as EventsOneResponse;
        if (cancelled) return;
        hydrate(json.event);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, hydrate]);

  function validate(): { ok: true; when: When } | { ok: false; message: string } {
    if (!title.trim()) return { ok: false, message: "Title is required." };
    if (!description.trim())
      return { ok: false, message: "Description is required." };

    const start = parseDateParts({
      year: startYear,
      month: startMonth,
      day: startDay,
      label: "Start",
    });
    if (!start.ok) return start;

    if (whenType === "point") {
      return { ok: true, when: { type: "point", start: start.value } };
    }

    const end = parseDateParts({
      year: endYear,
      month: endMonth,
      day: endDay,
      label: "End",
    });
    if (!end.ok) return end;

    const startKey = toSortableNumber(start.value);
    const endKey = toSortableNumber(end.value);
    if (endKey < startKey) {
      return { ok: false, message: "End date must be >= start date." };
    }

    return { ok: true, when: { type: "range", start: start.value, end: end.value } };
  }

  const validation = validate();

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const json = (await res.json()) as { imagePath: string };
      setImagePath(json.imagePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit() {
    setError(null);
    const v = validation;
    if (!v.ok) {
      setError(v.message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categories,
        imagePath,
        when: v.when,
      };

      if (props.mode === "create") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Create failed (${res.status}): ${txt}`);
        }
        router.push("/admin");
        router.refresh();
      } else {
        const res = await fetch(`/api/events/${props.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Save failed (${res.status}): ${txt}`);
        }
        router.push("/admin");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function addCategory() {
    const slug = slugify(categoryDraft);
    if (!slug) return;
    setCategories((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
    setCategoryDraft("");
  }

  function removeCategory(slug: string) {
    setCategories((prev) => prev.filter((c) => c !== slug));
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-paper-border bg-paper p-6 text-sm text-muted-ink">
        Loading…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-paper-border bg-paper p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none placeholder:text-muted-ink/70 focus:border-timeline-red/50"
            placeholder="e.g., Figure X born"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-28 w-full rounded-lg border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none placeholder:text-muted-ink/70 focus:border-timeline-red/50"
            placeholder="Add context, sources, details…"
          />
        </Field>

        <Field label="Categories">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                className="flex-1 rounded-lg border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none placeholder:text-muted-ink/70 focus:border-timeline-red/50"
                placeholder="Type and press Enter (e.g., war)"
              />
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-paper-border px-4 text-sm font-semibold text-ink hover:bg-cream"
              >
                Add
              </button>
            </div>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => removeCategory(c)}
                    className="rounded-full border border-paper-border bg-background px-3 py-1 text-xs font-semibold text-ink hover:bg-cream"
                    title="Remove"
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-ink">
                No categories yet.
              </div>
            )}
          </div>
        </Field>

        <Field label="When">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWhenType("point")}
                className={[
                  "rounded-md border px-3 py-2 text-sm font-semibold",
                  whenType === "point"
                    ? "border-timeline-red bg-timeline-red text-white"
                    : "border-paper-border bg-background text-muted-ink hover:bg-cream hover:text-ink",
                ].join(" ")}
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => setWhenType("range")}
                className={[
                  "rounded-md border px-3 py-2 text-sm font-semibold",
                  whenType === "range"
                    ? "border-timeline-red bg-timeline-red text-white"
                    : "border-paper-border bg-background text-muted-ink hover:bg-cream hover:text-ink",
                ].join(" ")}
              >
                Range
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="Start year*" value={startYear} onChange={setStartYear} />
              <NumberInput label="Start month" value={startMonth} onChange={setStartMonth} />
              <NumberInput label="Start day" value={startDay} onChange={setStartDay} />
            </div>

            {whenType === "range" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberInput label="End year*" value={endYear} onChange={setEndYear} />
                <NumberInput label="End month" value={endMonth} onChange={setEndMonth} />
                <NumberInput label="End day" value={endDay} onChange={setEndDay} />
              </div>
            ) : null}
          </div>
        </Field>

        <Field label="Image">
          <div className="flex flex-col gap-3">
            {imagePath ? (
              <div className="relative h-44 w-full overflow-hidden rounded-lg border border-paper-border bg-background">
                <Image
                  src={imagePath}
                  alt={title || "Event image"}
                  fill
                  className="object-cover"
                  sizes="700px"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-paper-border p-6 text-sm text-muted-ink">
                No image uploaded.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => setImagePath(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-paper-border px-4 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-50"
                disabled={!imagePath || uploading}
              >
                Remove image
              </button>
            </div>
            {uploading ? (
              <div className="text-xs text-muted-ink">
                Uploading…
              </div>
            ) : null}
          </div>
        </Field>

        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-paper-border px-4 text-sm font-semibold text-ink hover:bg-cream"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || uploading || !validation.ok}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-timeline-red px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : props.mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-medium text-muted-ink">
        {label}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted-ink">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-paper-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-timeline-red/50"
        placeholder="—"
      />
    </label>
  );
}

function parseDateParts(args: {
  year: string;
  month: string;
  day: string;
  label: string;
}):
  | { ok: true; value: DateParts }
  | { ok: false; message: string } {
  const year = parseInt(args.year, 10);
  if (!Number.isFinite(year)) {
    return { ok: false, message: `${args.label} year is required.` };
  }
  const month = args.month ? parseInt(args.month, 10) : undefined;
  if (args.month && (!Number.isFinite(month) || month! < 1 || month! > 12)) {
    return { ok: false, message: `${args.label} month must be 1-12.` };
  }
  const day = args.day ? parseInt(args.day, 10) : undefined;
  if (args.day && (!Number.isFinite(day) || day! < 1 || day! > 31)) {
    return { ok: false, message: `${args.label} day must be 1-31.` };
  }
  return { ok: true, value: { year, month, day } };
}

function toSortableNumber(d: DateParts): number {
  const mm = d.month ?? 1;
  const dd = d.day ?? 1;
  return d.year * 10000 + mm * 100 + dd;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

