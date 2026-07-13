import Link from "next/link";
import { AiSynthesis } from "@/components/conseils/ai-synthesis";
import { RecommendationList } from "@/components/conseils/recommendation-list";
import { Card, CardContent } from "@/components/ui/card";
import { buildRecommendations } from "@/lib/advisor";
import { buildAdvisorSnapshot } from "@/lib/advisor-snapshot";
import { syncPrices } from "@/lib/prices";
import { listAccounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ConseilsPage() {
  await syncPrices();
  const accounts = listAccounts();

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-lg pt-16">
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h1 className="font-serif text-2xl">Conseils</h1>
            <p className="text-sm text-ink-2">
              Créez un compte et renseignez votre profil pour recevoir des
              recommandations personnalisées.
            </p>
            <Link
              href="/comptes"
              className="inline-flex h-9 items-center bg-ink px-4 text-sm font-medium text-page transition-opacity duration-150 hover:opacity-85"
            >
              Créer un compte
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot = buildAdvisorSnapshot();
  const recommendations = buildRecommendations(snapshot);
  const aiAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Conseils</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Recommandations calculées localement à partir de votre patrimoine et
          de votre profil. À titre informatif — ce n’est pas un conseil en
          investissement personnalisé.
        </p>
      </div>

      <RecommendationList items={recommendations} />

      <AiSynthesis available={aiAvailable} />
    </div>
  );
}
