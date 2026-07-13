"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { synthesizeAdvice, type SynthesisResult } from "@/app/conseils/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Synthèse IA optionnelle. Le bouton n'envoie les données au service Claude
 * que sur clic explicite ; sans clé configurée, l'action le signale sans appel.
 */
export function AiSynthesis({ available }: { available: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<SynthesisResult | null>(null);

  function onClick() {
    startTransition(async () => {
      setResult(await synthesizeAdvice());
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthèse IA (optionnelle)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-ink-2">
          Met en récit les conseils ci-dessus avec Claude. Vos données ne sont
          envoyées qu’au moment où vous cliquez, et uniquement pour cette
          synthèse.
        </p>

        {available ? (
          <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {pending ? "Rédaction…" : "Générer la synthèse"}
          </Button>
        ) : (
          <p className="border border-edge bg-page px-4 py-3 text-xs text-muted">
            Synthèse IA indisponible : définissez la variable d’environnement{" "}
            <code className="text-ink-2">ANTHROPIC_API_KEY</code> pour l’activer.
            Les conseils ci-dessus fonctionnent sans elle.
          </p>
        )}

        {result?.ok && result.text && (
          <div className="space-y-2 border-l-2 border-accent bg-page px-4 py-3">
            {result.text.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink">
                {para}
              </p>
            ))}
          </div>
        )}

        {result && !result.ok && (
          <p className="text-xs text-ink-2">{result.reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
