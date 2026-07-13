"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* À placer dans le <form action={refreshPrices}> : montre l'action en cours. */
export function RefreshButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="ghost" size="sm" type="submit" disabled={pending}>
      <RefreshCw
        className={cn("size-3.5", pending && "animate-spin")}
        aria-hidden="true"
      />
      {pending ? "Actualisation…" : "Actualiser les cours"}
    </Button>
  );
}
