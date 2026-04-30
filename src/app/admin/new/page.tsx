import Link from "next/link";
import { EventForm } from "@/components/Admin/EventForm";

export default function NewEventPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          New event
        </h1>
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-ink transition-colors hover:text-ink"
        >
          Back
        </Link>
      </div>

      <EventForm mode="create" />
    </div>
  );
}

