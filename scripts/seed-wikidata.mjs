import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");

function clampYear(y) {
  if (!Number.isFinite(y)) return null;
  if (y < 0 || y > 9999) return null;
  return Math.trunc(y);
}

function yearFromWikidataDate(dateTimeStr) {
  // Example: "0821-01-01T00:00:00Z"
  const m = /^(-?\d{1,6})-/.exec(dateTimeStr);
  if (!m) return null;
  return clampYear(Number(m[1]));
}

function slugifyId(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function pickCategories(desc) {
  const d = (desc ?? "").toLowerCase();
  const cats = new Set(["public-figure"]);
  if (
    d.includes("hadith") ||
    d.includes("imam") ||
    d.includes("theolog") ||
    d.includes("jurist") ||
    d.includes("sufi") ||
    d.includes("qadi") ||
    d.includes("islamic scholar") ||
    d.includes("muslim scholar") ||
    d.includes("muhaddith")
  ) {
    cats.add("religion-figure");
  }
  if (
    d.includes("commander") ||
    d.includes("general") ||
    d.includes("warrior") ||
    d.includes("military")
  ) {
    cats.add("war");
  }
  return Array.from(cats);
}

async function fetchWikidataRows() {
  const query = `
SELECT ?human ?humanLabel ?humanDescription ?birthDate WHERE {
  ?human wdt:P31 wd:Q5 .
  ?human wdt:P140 wd:Q432 .
  ?human wdt:P569 ?birthDate .
  FILTER(?birthDate >= "0500-01-01T00:00:00Z"^^xsd:dateTime && ?birthDate <= "1000-12-31T23:59:59Z"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 100
`.trim();

  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("format", "json");
  url.searchParams.set("query", query);

  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "history-timeline-seed/1.0 (local)",
    },
  });
  if (!res.ok) throw new Error(`Wikidata request failed: ${res.status}`);
  const json = await res.json();
  return json.results.bindings;
}

async function readExisting() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const txt = await fs.readFile(EVENTS_PATH, "utf8");
    const parsed = JSON.parse(txt || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toEvent(row) {
  const name = row?.humanLabel?.value?.trim();
  const desc = row?.humanDescription?.value?.trim() ?? "";
  const birthYear = yearFromWikidataDate(row?.birthDate?.value ?? "");
  if (!name || !birthYear) return null;

  const id = `wd-born-${birthYear}-${slugifyId(name)}`;
  const createdAt = new Date().toISOString();

  return {
    id,
    title: `${name} is born`,
    description: desc
      ? `${name} (${birthYear}) — ${desc}.`
      : `${name} is born (${birthYear}).`,
    categories: pickCategories(desc),
    imagePath: null,
    when: { type: "point", start: { year: birthYear } },
    createdAt,
    updatedAt: createdAt,
  };
}

function dedupeById(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!it?.id || typeof it.id !== "string") continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function sortByWhenStart(items) {
  const key = (e) => {
    const y = e?.when?.start?.year ?? 0;
    const m = e?.when?.start?.month ?? 1;
    const d = e?.when?.start?.day ?? 1;
    return y * 10000 + m * 100 + d;
  };
  return [...items].sort((a, b) => key(a) - key(b));
}

async function main() {
  const existing = await readExisting();
  const rows = await fetchWikidataRows();
  const generated = rows.map(toEvent).filter(Boolean);

  const merged = dedupeById([...existing, ...generated]);
  const sorted = sortByWhenStart(merged);

  const pretty = JSON.stringify(sorted, null, 2) + "\n";
  await fs.writeFile(EVENTS_PATH, pretty, "utf8");

  console.log(
    `Wrote ${generated.length} generated events (merged total: ${sorted.length}) to ${path.relative(ROOT, EVENTS_PATH)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

