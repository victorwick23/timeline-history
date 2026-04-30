import { Timeline } from "@/components/Timeline/Timeline";

export default function Home() {
  return (
    <div className="w-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="rounded-[28px] border border-paper-border bg-paper p-7 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          <div className="text-xs font-semibold tracking-[0.22em] text-muted-ink">
            HISTORY TIMELINE
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Explore history on a timeline
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-ink">
            Filter by category and search for keywords. Add events in the admin
            dashboard and they’ll appear here automatically.
          </p>
        </div>

        <Timeline />
      </div>
    </div>
  );
}
