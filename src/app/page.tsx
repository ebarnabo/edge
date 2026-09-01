import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/lib/fdj/games";
import { totalCombinations, rankTable } from "@/lib/loto/probability";
import { loadDraws } from "@/lib/data";
import { num, pct } from "@/lib/utils";

export default async function Home() {
  const loto = GAMES.loto;
  const dataset = await loadDraws("loto");
  const rank1 = rankTable(loto)[0];

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-8">
        <h1 className="max-w-[18ch] text-[2.5rem] leading-[0.98] font-extrabold tracking-tight text-balance sm:text-5xl sm:leading-[0.95] lg:text-6xl">
          Deux jeux, deux mathématiques opposées.
        </h1>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-loto/20">
            <CardContent className="flex flex-col gap-6">
              <span className="text-sm text-faint">Tirages</span>
              <p className="tnum text-4xl font-extrabold tracking-tight text-loto">
                {pct(loto.trj, 2)}
              </p>
              <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
                Part de chaque euro misé redistribuée aux joueurs au Loto. Le reste est la marge de
                la structure. Aucune analyse d&apos;historique ne déplace ce chiffre : les tirages
                sont indépendants, et le rang&nbsp;1 reste à 1 chance sur{" "}
                <span className="tnum font-bold text-ink">{num(totalCombinations(loto))}</span>{" "}
                quelle que soit la grille.
              </p>
              <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-raised">
                <div className="bg-loto" style={{ width: `${loto.trj * 100}%` }} />
              </div>
              <Button asChild variant="outline" className="self-start">
                <Link href="/loto">Voir les probabilités réelles</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-edge/20">
            <CardContent className="flex flex-col gap-6">
              <span className="text-sm text-faint">Sport</span>
              <p className="tnum text-4xl font-extrabold tracking-tight text-edge">Dixon–Coles</p>
              <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
                Un match n&apos;est pas un tirage : la force des équipes, l&apos;avantage du
                terrain et la forme récente sont mesurables. Le modèle produit ses propres
                probabilités à partir des résultats, puis les confronte au marché une fois la marge
                du bookmaker retirée.
              </p>
              <div aria-hidden className="flex h-3 gap-1 overflow-hidden rounded-full">
                <div className="flex-[46] rounded-full bg-edge" />
                <div className="flex-[27] rounded-full bg-raised" />
                <div className="flex-[27] rounded-full bg-euro/50" />
              </div>
              <Button asChild variant="outline" className="self-start">
                <Link href="/sports">Ouvrir le modèle</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight">Ce que l&apos;application calcule</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Test d'uniformité"
            body={
              dataset
                ? `χ² sur ${num(dataset.count)} tirages Loto importés, pour vérifier qu'aucun numéro n'est réellement favorisé.`
                : "χ² sur l'historique officiel FDJ, pour vérifier qu'aucun numéro n'est réellement favorisé."
            }
          />
          <Feature
            title="Espérance de gain"
            body={`Gain moyen par grille, partage du jackpot inclus. Le rang 1 tombe 1 fois sur ${num(Math.round(rank1.odds))}.`}
          />
          <Feature
            title="Systèmes réducteurs"
            body="Le plus petit nombre de grilles qui garantit encore un rang minimal sur ta sélection. La dépense baisse, la garantie tient."
          />
          <Feature
            title="Buts attendus"
            body="Intensités d'attaque et de défense ajustées par vraisemblance pondérée dans le temps, avec correction des scores serrés."
          />
          <Feature
            title="Elo NBA"
            body="Classement pondéré par l'écart de points, avec avantage du terrain et pénalité back-to-back."
          />
          <Feature
            title="Écart au marché"
            body="Marge retirée par la méthode de Shin, puis mise en Kelly fractionné quand le modèle est réellement plus confiant."
          />
        </div>
      </section>

      <p className="max-w-[68ch] rounded-[24px] border border-line/60 bg-surface/40 p-8 text-sm leading-relaxed text-muted">
        Les jeux d&apos;argent et de hasard comportent des risques : endettement, isolement,
        dépendance. Toute analyse statistique correcte aboutit à la même conclusion — sur la durée,
        la mise moyenne ne revient pas. Si le jeu pèse sur ton budget ou sur ton moral,
        joueurs-info-service.fr et le 09 74 75 13 13 sont gratuits et anonymes.
      </p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
      </CardContent>
    </Card>
  );
}
