"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, PiggyBank, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/simulation", label: "Simulation", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="shrink-0 border-b border-edge bg-surface md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-4 md:py-6">
        <PiggyBank className="size-6 text-accent" aria-hidden />
        <span className="text-lg font-semibold tracking-tight">MoneyPlan</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-ink-2 hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
