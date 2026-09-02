import { HomeBento } from "@/components/home/home-bento";
import { PageHeader } from "@/components/ui/page-header";
import { MotionPage } from "@/components/motion/motion-page";
import { GAMES } from "@/lib/fdj/games";
import { totalCombinations, rankTable } from "@/lib/loto/probability";
import { loadDraws } from "@/lib/data";

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

        <HomeBento
          trjPercent={loto.trj * 100}
          combinations={totalCombinations(loto)}
          drawCount={dataset?.count ?? null}
          rank1Odds={Math.round(rank1.odds)}
        />

        <p className="rounded-[var(--radius-card)] border border-line bg-subtle px-4 py-3 text-sm leading-relaxed text-muted">
          Les jeux d&apos;argent comportent des risques. Sur la durée, la mise moyenne ne revient pas.
          Aide gratuite : joueurs-info-service.fr — 09 74 75 13 13.
        </p>
      </div>
    </MotionPage>
  );
}
