import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import type { GameAnalysis } from "@/lib/loto/stats";
import { num } from "@/lib/utils";

export function RandomnessVerdict({ analysis }: { analysis: GameAnalysis }) {
  const { mainTest } = analysis;
  const hottest = [...analysis.main].sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];

  return (
    <Card className="border-line/50 bg-surface/50">
      <CardContent className="flex flex-col gap-8">
        <p className="max-w-[54ch] text-2xl leading-snug font-bold tracking-tight text-balance">
          Sur {num(mainTest.sample)} tirages, les fréquences de sortie sont{" "}
          {mainTest.uniform ? "indiscernables du hasard pur" : "statistiquement atypiques"}.
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          <Stat
            label="χ² d'uniformité"
            value={mainTest.chiSquare.toFixed(1)}
            hint={`${mainTest.degreesOfFreedom} degrés de liberté`}
          />
          <Stat
            label="p-value"
            value={mainTest.pValue.toFixed(3)}
            tone={mainTest.uniform ? "edge" : "warn"}
            hint={
              mainTest.uniform
                ? "Au-dessus de 0,05 : aucun biais détectable dans le tirage."
                : "Sous 0,05 : l'écart mérite un examen, souvent un changement de règles du jeu."
            }
          />
          <Stat
            label="Écart le plus marqué"
            value={`n° ${hottest.n} · ${hottest.z > 0 ? "+" : ""}${hottest.z.toFixed(2)} σ`}
            hint="Un tirage uniforme produit toujours quelques numéros à deux écarts-types. C'est du bruit, pas un signal."
          />
        </div>

        <p className="max-w-[68ch] border-t border-line/60 pt-6 text-sm leading-relaxed text-muted">
          Chaque boule est retirée d&apos;une urne remise à zéro. Un numéro absent depuis quarante
          tirages a exactement la même chance de sortir qu&apos;un numéro tombé hier. Les fréquences
          ci-dessous décrivent le passé — elles ne portent aucune information sur le prochain
          tirage. Ce que cette page peut réellement t&apos;apporter tient dans les deux outils
          suivants : le coût réel de ta mise, et le nombre minimal de grilles pour une garantie
          donnée.
        </p>
      </CardContent>
    </Card>
  );
}
