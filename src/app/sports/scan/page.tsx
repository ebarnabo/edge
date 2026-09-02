import { ScanPageClient } from "@/components/sports/scan-page-client";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { loadFixtures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
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
          hint="Le script récupère les rencontres programmées des quatorze prochains jours en football et des huit prochains jours en NBA."
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

  return <ScanPageClient competitionCodes={competitionCodes} />;
}
