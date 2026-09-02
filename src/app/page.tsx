import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { MotionPage } from "@/components/motion/motion-page";
import { GAMES } from "@/lib/fdj/games";
import { totalCombinations, rankTable } from "@/lib/loto/probability";
import { loadDraws } from "@/lib/data";
import { num, pct } from "@/lib/utils";

export default async function Home() {
  const loto = GAMES.loto;
  const dataset = await loadDraws("loto");
  const rank1 = rankTable(loto)[0];

  return (
    <MotionPage>
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Analyse probabiliste"
        title="Deux jeux, deux mathématiques opposées."
        description="Tirages indépendants d'un côté, matchs prédictibles de l'autre. L'application calcule les probabilités réelles et les confronte aux données."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <span className="text-label text-loto">Tirages FDJ</span>
            <p className="tnum text-3xl font-semibold tracking-tight text-loto">{pct(loto.trj, 2)}</p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
              Part de chaque euro misé redistribuée aux joueurs au Loto. Le rang&nbsp;1 reste à 1
              chance sur{" "}
              <span className="tnum font-medium text-ink">{num(totalCombinations(loto))}</span>{" "}
              quelle que soit la grille.
            </p>
            <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="bg-loto" style={{ width: `${loto.trj * 100}%` }} />
            </div>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href="/loto">Voir les probabilités</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <span className="text-label text-accent">Sport</span>
            <p className="text-3xl font-semibold tracking-tight text-accent">Dixon–Coles</p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
              Force des équipes, avantage du terrain et forme récente sont mesurables. Le modèle
              produit ses propres probabilités, puis les confronte au marché.
            </p>
            <div aria-hidden className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              <div className="flex-[46] rounded-full bg-accent" />
              <div className="flex-[27] rounded-full bg-subtle" />
              <div className="flex-[27] rounded-full bg-euro/30" />
            </div>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href="/sports">Ouvrir les modèles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Ce que l&apos;application calcule</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Test d'uniformité"
            body={
              dataset
                ? `χ² sur ${num(dataset.count)} tirages Loto importés.`
                : "χ² sur l'historique officiel FDJ."
            }
          />
          <Feature
            title="Espérance de gain"
            body={`Gain moyen par grille. Rang 1 : 1 sur ${num(Math.round(rank1.odds))}.`}
          />
          <Feature title="Systèmes réducteurs" body="Le plus petit nombre de grilles pour une garantie donnée." />
          <Feature title="Buts attendus" body="Intensités d'attaque et défense ajustées dans le temps." />
          <Feature title="Elo NBA" body="Classement pondéré par l'écart de points et le calendrier." />
          <Feature title="Écart au marché" body="Marge retirée, mise en Kelly fractionné si value." />
        </div>
      </section>

      <p className="rounded-[var(--radius-card)] border border-line bg-subtle px-4 py-3 text-sm leading-relaxed text-muted">
        Les jeux d&apos;argent comportent des risques. Sur la durée, la mise moyenne ne revient pas.
        Aide gratuite : joueurs-info-service.fr — 09 74 75 13 13.
      </p>
    </div>
    </MotionPage>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line px-4 py-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
