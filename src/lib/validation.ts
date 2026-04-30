import { z } from "zod";

/**
 * Year bounds so `toSortableNumber` (`year * 10000 + month * 100 + day`) stays
 * within `Number.MIN_SAFE_INTEGER` / `Number.MAX_SAFE_INTEGER` for all valid
 * month/day combinations (incl. BCE / deep-time years in `data/events.json`).
 */
export const EVENT_YEAR_MIN = Math.ceil(
  (Number.MIN_SAFE_INTEGER - 101) / 10_000,
);
export const EVENT_YEAR_MAX = Math.floor(
  (Number.MAX_SAFE_INTEGER - 1231) / 10_000,
);

export const DatePartsSchema = z
  .object({
    year: z.number().int().min(EVENT_YEAR_MIN).max(EVENT_YEAR_MAX),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
  })
  .strict();

export const WhenPointSchema = z
  .object({
    type: z.literal("point"),
    start: DatePartsSchema,
  })
  .strict();

export const WhenRangeSchema = z
  .object({
    type: z.literal("range"),
    start: DatePartsSchema,
    end: DatePartsSchema,
  })
  .strict()
  .refine(
    (v) => {
      const startKey = toSortableNumber(v.start);
      const endKey = toSortableNumber(v.end);
      return endKey >= startKey;
    },
    { message: "End date must be >= start date", path: ["end"] },
  );

export const WhenSchema = z.union([WhenPointSchema, WhenRangeSchema]);

export const EventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(10_000),
    categories: z.array(z.string().min(1).max(50)).default([]),
    imagePath: z.string().min(1).nullable().default(null),
    when: WhenSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateEventInputSchema = EventSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateEventInputSchema = CreateEventInputSchema.partial();

export const EventsFileSchema = z.array(EventSchema);

export type DateParts = z.infer<typeof DatePartsSchema>;
export type WhenPoint = z.infer<typeof WhenPointSchema>;
export type WhenRange = z.infer<typeof WhenRangeSchema>;
export type When = z.infer<typeof WhenSchema>;
export type TimelineEvent = z.infer<typeof EventSchema>;

export function toSortableNumber(d: DateParts): number {
  const mm = d.month ?? 1;
  const dd = d.day ?? 1;
  return d.year * 10000 + mm * 100 + dd;
}

