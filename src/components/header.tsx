"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Tableau de bord" },
  { href: "/transactions", label: "Transactions" },
  { href: "/simulation", label: "Simulation" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-edge">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-8 gap-y-1 px-5 pt-5 md:px-8">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-ink"
          translate="no"
        >
          MoneyPlan
          <span className="ml-2 align-middle text-[10px] font-sans font-medium uppercase tracking-[0.18em] text-muted">
            PEA
          </span>
        </Link>
        <nav
          aria-label="Navigation principale"
          className="-mb-px ml-auto flex gap-6 overflow-x-auto"
        >
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-2 pb-3 text-sm transition-colors duration-150",
                  active
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-ink-2 hover:border-axis hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
