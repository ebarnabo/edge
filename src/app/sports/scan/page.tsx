import { ScanTable } from "@/components/sports/scan-table";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { scanFixtures } from "@/lib/sports/scan";
import { loadFixtures } from "@/lib/data";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ bankroll?: string; seuil?: string }>;
}) {
  const params = await searchParams;
  const bankroll = Number(params.bankroll) || 100;
  const threshold = (Number(params.seuil) || 3) / 100;

  const fixtures = await loadFixtures();
  if (!fixtures?.fixtures.length) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Matchs à venir"
          description="Chaque rencontre programmée passe dans l'ensemble validé, puis se confronte au consensus de plusieurs opérateurs."
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

  const scan = await scanFixtures({ bankroll, threshold });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Matchs à venir"
        description="Chaque rencontre programmée passe dans l'ensemble validé, puis se confronte au consensus de plusieurs opérateurs. La marge est retirée chez chacun avant comparaison."
        link={{ href: "/sports", label: "Modèles et validation →" }}
      />

      <Card>
        <CardContent className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Matchs analysés" value={num(scan.rows.length)} />
          <Stat label="Avec cotes" value={num(scan.withOdds)} />
          <Stat
            label="Écarts détectés"
            value={num(scan.opportunities)}
            tone={scan.opportunities > 0 ? "edge" : "default"}
          />
          <Stat
            label="Bankroll"
            value={`${bankroll} €`}
            hint={`Seuil ${(threshold * 100).toFixed(0)} % · ?bankroll=200&seuil=4`}
          />
        </CardContent>
      </Card>

      {scan.withOdds === 0 && (
        <EmptyState
          title="Prédictions sans confrontation au marché"
          hint="Les matchs sont prédits, mais aucune cote n'est chargée : impossible de mesurer un écart. Ajoute ODDS_API_KEY puis lance l'import."
          command="npm run ingest:odds"
        />
      )}

      <ScanTable rows={scan.rows} />

      <p className="max-w-[70ch] rounded-[14px] border border-line/50 bg-subtle px-5 py-4 text-sm leading-relaxed text-muted">
        Le classement pondère l&apos;écart au marché par l&apos;apport mesuré du modèle sur ce
        championnat. Les cotes datent de leur import — elles bougent, vérifie avant de miser.
      </p>
    </div>
  );
}
