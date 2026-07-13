"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountSwitcher, type AccountOption } from "@/components/accounts/account-switcher";

const links = [
  { href: "/", label: "Patrimoine" },
  { href: "/comptes", label: "Comptes" },
  { href: "/conseils", label: "Conseils" },
  { href: "/simulation", label: "Simulation" },
  { href: "/profil", label: "Profil" },
];

export function Header({ accounts }: { accounts: AccountOption[] }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-edge">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 pt-4 md:px-8">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-ink"
          translate="no"
        >
          MoneyPlan
        </Link>
        {accounts.length > 0 && (
          <AccountSwitcher accounts={accounts} pathname={pathname} />
        )}
        <nav
          aria-label="Navigation principale"
          className="-mb-px ml-auto flex gap-6 overflow-x-auto"
        >
          {links.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : href === "/comptes"
                  ? pathname.startsWith("/comptes")
                  : pathname.startsWith(href);
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
