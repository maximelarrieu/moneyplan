import { redirect } from "next/navigation";
import { getFirstAccount } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Ancienne URL mono-compte : on redirige vers les transactions du 1er compte.
export default function TransactionsRedirect() {
  redirect(`/comptes/${getFirstAccount().id}/transactions`);
}
