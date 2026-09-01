import Link from "next/link";
import { ScanTable } from "@/components/sports/scan-table";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="flex flex-col gap-10">
        <Header />
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
      <Header />

      <Card>
        <CardContent className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
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
            hint={`Seuil d'écart à ${(threshold * 100).toFixed(0)} %. Ajuste par ?bankroll=200&seuil=4 dans l'adresse.`}
          />
        </CardContent>
      </Card>

      {scan.withOdds === 0 && (
        <EmptyState
          title="Prédictions sans confrontation au marché"
          hint="Les matchs sont prédits, mais aucune cote n'est chargée : impossible de mesurer un écart. Ajoute ODDS_API_KEY dans .env.local puis lance l'import."
          command="npm run ingest:odds"
        />
      )}

      <ScanTable rows={scan.rows} />

      <p className="max-w-[70ch] text-xs leading-relaxed text-faint">
        Le classement pondère l&apos;écart au marché par l&apos;apport mesuré du modèle sur ce
        championnat. Un écart de 3 % annoncé par un modèle qui ne bat les fréquences de base que
        de 1 % ne vaut pas le même écart annoncé par un modèle à 8 %. Les cotes datent de leur
        import — elles bougent, vérifie avant de miser.
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Matchs à venir</h1>
        <Link href="/sports" className="text-sm font-semibold text-muted underline">
          modèles et validation
        </Link>
      </div>
      <p className="max-w-[66ch] leading-relaxed text-muted">
        Chaque rencontre programmée passe dans l&apos;ensemble validé, puis se confronte au
        consensus de plusieurs opérateurs. La marge est retirée chez chacun avant comparaison, et
        la mise se chiffre au meilleur prix trouvé.
      </p>
    </header>
  );
}
