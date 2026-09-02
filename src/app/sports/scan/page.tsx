import { Suspense } from "react";
import { ScanTable } from "@/components/sports/scan-table";
import { ScanFilters } from "@/components/sports/scan-filters";
import { CompetitionFilter } from "@/components/sports/competition-filter";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { scanFixtures } from "@/lib/sports/scan";
import { filterScanRows, type ViewFilter } from "@/lib/sports/filter-rows";
import { formatFreshness } from "@/lib/sports/display";
import { loadFixtures } from "@/lib/data";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{
    bankroll?: string;
    seuil?: string;
    c?: string;
    q?: string;
    vue?: string;
  }>;
}) {
  const params = await searchParams;
  const bankroll = Number(params.bankroll) || 100;
  const threshold = (Number(params.seuil) || 3) / 100;
  const competition = params.c ?? null;
  const query = params.q ?? "";
  const view = (["all", "value", "favoris", "cotes"].includes(params.vue ?? "")
    ? params.vue
    : "all") as ViewFilter;

  const fixtures = await loadFixtures();
  if (!fixtures?.fixtures.length) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Matchs à venir"
          description="Analyse chaque rencontre programmée et compare les probabilités du modèle aux cotes du marché."
          link={{ href: "/sports", label: "Modèles et validation →" }}
        />
        <EmptyState
          title="Aucun match à venir"
          hint="Le script récupère les rencontres programmées des quatorze prochains jours en football et des huit prochains jours en NBA. Lance ensuite l'import des cotes pour activer la détection d'écarts."
          command="npm run ingest:fixtures && npm run ingest:odds"
        />
      </div>
    );
  }

  const competitionCodes = [
    ...new Set(fixtures.fixtures.filter((f) => f.sport === "football").map((f) => f.competition)),
  ];
  if (fixtures.fixtures.some((f) => f.sport === "nba")) {
    competitionCodes.push("NBA");
  }

  const scan = await scanFixtures({ bankroll, threshold });

  let rows = competition
    ? scan.rows.filter((r) =>
        competition === "NBA" ? r.fixture.sport === "nba" : r.fixture.competition === competition,
      )
    : scan.rows;

  rows = filterScanRows(rows, { query, view });

  const withOdds = rows.filter((r) => r.market).length;
  const opportunities = rows.filter((r) => r.bestEdge).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Matchs à venir"
        description="Le modèle estime les probabilités de chaque issue. Quand des cotes sont disponibles, on compare ces estimations au marché pour repérer les écarts exploitables."
        link={{ href: "/sports", label: "Modèles et validation →" }}
      />

      <Card>
        <CardContent className="flex flex-col gap-6">
          <Suspense fallback={null}>
            <CompetitionFilter codes={competitionCodes} active={competition} />
          </Suspense>

          <Suspense fallback={null}>
            <ScanFilters bankroll={bankroll} threshold={threshold} view={view} query={query} />
          </Suspense>

          <div className="grid gap-6 border-t border-line/50 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Matchs affichés" value={num(rows.length)} />
            <Stat label="Avec cotes" value={num(withOdds)} />
            <Stat
              label="Opportunités"
              value={num(opportunities)}
              tone={opportunities > 0 ? "edge" : "default"}
            />
            <Stat label="Bankroll" value={`${bankroll} €`} hint={`Seuil ${(threshold * 100).toFixed(0)} %`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Comment lire cette page</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong className="text-ink">Modèle</strong> — probabilité estimée par nos algorithmes
              (forme, confrontations, calendrier…).
            </li>
            <li>
              <strong className="text-ink">Marché</strong> — ce que les parieurs impliquent via les
              cotes, une fois la marge des bookmakers retirée.
            </li>
            <li>
              <strong className="text-ink">Écart</strong> — différence modèle vs marché. Au-dessus du
              seuil, c&apos;est une opportunité potentielle.
            </li>
            <li>
              <strong className="text-ink">Mise suggérée</strong> — indication basée sur Kelly (25 %
              de la bankroll), pas un conseil de pari.
            </li>
          </ul>
          {(scan.fixturesUpdatedAt || scan.oddsUpdatedAt) && (
            <p className="border-t border-line/50 pt-3 text-xs">
              Données : calendrier {formatFreshness(scan.fixturesUpdatedAt)} · cotes{" "}
              {formatFreshness(scan.oddsUpdatedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {scan.withOdds === 0 && (
        <EmptyState
          title="Prédictions sans confrontation au marché"
          hint="Les matchs sont prédits, mais aucune cote n'est chargée : impossible de mesurer un écart. Ajoute ODDS_API_KEY puis lance l'import."
          command="npm run ingest:odds"
        />
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun match pour ces critères"
          hint="Essaie une autre compétition, retire la recherche ou change le filtre d'affichage."
        />
      ) : (
        <ScanTable rows={rows} />
      )}

      <p className="max-w-[70ch] rounded-[14px] border border-line/50 bg-subtle px-5 py-4 text-sm leading-relaxed text-muted">
        Les opportunités sont classées par écart au marché, pondéré par la fiabilité du modèle sur
        ce championnat. Les cotes évoluent en continu — vérifie avant de miser.
      </p>
    </div>
  );
}
