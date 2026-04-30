import Link from "next/link";
import Image from "next/image";

const navItems = [{ href: "/", label: "Timeline" }] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper-border bg-paper">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-ink"
        >
          <Image
            src="/logo-timeline-history.png"
            alt="History Timeline"
            width={28}
            height={28}
            priority
          />
          <span>History Timeline</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-ink transition-colors hover:bg-cream hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

