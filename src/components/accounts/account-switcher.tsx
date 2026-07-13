"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";

export interface AccountOption {
  id: number;
  name: string;
  type: string;
}

/**
 * Sélecteur de compte : navigue vers /comptes/[id]. Reflète le compte courant
 * quand on est déjà sur une page de compte.
 */
export function AccountSwitcher({
  accounts,
  pathname,
}: {
  accounts: AccountOption[];
  pathname: string;
}) {
  const router = useRouter();
  const match = pathname.match(/^\/comptes\/(\d+)/);
  const currentId = match ? match[1] : "";

  return (
    <Select
      aria-label="Compte affiché"
      className="h-8 w-auto max-w-56 text-xs"
      value={currentId}
      onChange={(e) => {
        if (e.target.value) router.push(`/comptes/${e.target.value}`);
      }}
    >
      <option value="" disabled>
        Choisir un compte…
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name} · {ACCOUNT_TYPE_LABELS[a.type] ?? a.type}
        </option>
      ))}
    </Select>
  );
}
