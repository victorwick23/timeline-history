import Link from "next/link";
import { AdminEventsList } from "@/components/Admin/AdminEventsList";

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 rounded-xl border border-paper-border bg-paper p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-ink">
            Create, edit, and delete timeline events.
          </p>
        </div>
        <Link
          href="/admin/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-timeline-red px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          New event
        </Link>
      </div>

      <AdminEventsList />
    </div>
  );
}

