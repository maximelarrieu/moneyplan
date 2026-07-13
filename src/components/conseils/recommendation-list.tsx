import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Recommendation, RecoTone } from "@/lib/advisor";
import { cn } from "@/lib/utils";

const TONE: Record<
  RecoTone,
  { icon: LucideIcon; color: string; label: string }
> = {
  action: { icon: Target, color: "var(--accent)", label: "À faire" },
  warning: { icon: AlertTriangle, color: "var(--neg)", label: "Vigilance" },
  info: { icon: Info, color: "var(--chart-2)", label: "Repère" },
  good: { icon: Check, color: "var(--pos)", label: "OK" },
};

export function RecommendationList({ items }: { items: Recommendation[] }) {
  if (items.length === 0) {
    return (
      <p className="border border-edge bg-surface px-5 py-8 text-center text-sm text-ink-2">
        Rien à signaler pour l’instant. Renseignez vos revenus et dépenses dans
        le{" "}
        <Link href="/profil" className="text-accent hover:underline">
          profil
        </Link>{" "}
        pour des conseils chiffrés.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((r) => {
        const { icon: Icon, color, label } = TONE[r.tone];
        return (
          <li
            key={r.id}
            className="border border-edge bg-surface"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex gap-3 px-5 py-4">
              <Icon
                className="mt-0.5 size-4 shrink-0"
                style={{ color }}
                aria-hidden="true"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h3 className="font-medium text-ink">{r.title}</h3>
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color }}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-2">{r.detail}</p>
                {r.href && (
                  <Link
                    href={r.href}
                    className={cn(
                      "inline-flex items-center gap-1 text-sm text-accent",
                      "transition-opacity duration-150 hover:opacity-75",
                    )}
                  >
                    Y aller <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
