import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Dices,
  LineChart,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeBento({
  trjLabel,
  combinationsLabel,
  drawCount,
  rank1OddsLabel,
}: {
  trjLabel: string;
  combinationsLabel: string;
  drawCount: number | null;
  rank1OddsLabel: string;
}) {
  return (
    <div className="grid auto-rows-[minmax(11rem,auto)] grid-cols-3 gap-4 md:auto-rows-[18rem]">
      <BentoTile
        name="Tirages FDJ"
        description="TRJ, espérance de gain et tests d'uniformité sur l'historique officiel."
        href="/loto"
        cta="Voir les probabilités"
        Icon={Dices}
        className="col-span-3 lg:col-span-2"
        accent="loto"
        highlight={
          <>
            <span className="text-label text-loto">TRJ Loto</span>
            <span className="tnum text-4xl font-bold text-loto">{trjLabel}</span>
          </>
        }
      />

      <BentoTile
        name="Modèles sport"
        description="Dixon–Coles, Elo NBA et confrontation systématique au marché des cotes."
        href="/sports"
        cta="Ouvrir les modèles"
        Icon={LineChart}
        className="col-span-3 lg:col-span-1"
        accent="accent"
      />

      <FeatureTile
        name="Test d'uniformité"
        description={
          drawCount
            ? `χ² sur ${drawCount.toLocaleString("fr-FR")} tirages Loto importés.`
            : "χ² sur l'historique officiel FDJ."
        }
        Icon={ShieldCheck}
        className="col-span-3 md:col-span-1"
      />
      <FeatureTile
        name="Espérance de gain"
        description={`Rang 1 : 1 chance sur ${rank1OddsLabel}.`}
        Icon={Calculator}
        className="col-span-3 md:col-span-1"
      />
      <FeatureTile
        name="Systèmes réducteurs"
        description="Le plus petit nombre de grilles pour une garantie donnée."
        Icon={BarChart3}
        className="col-span-3 md:col-span-1"
      />
      <FeatureTile
        name="Buts attendus"
        description="Intensités d'attaque et défense ajustées dans le temps."
        Icon={TrendingUp}
        className="col-span-3 md:col-span-1"
        href="/sports"
      />
      <FeatureTile
        name="Écart au marché"
        description="Marge retirée, mise Kelly fractionné si value."
        Icon={TrendingUp}
        className="col-span-3 md:col-span-1"
        href="/sports/scan"
      />
      <FeatureTile
        name="Combinaisons Loto"
        description={`${combinationsLabel} grilles possibles au rang 1.`}
        Icon={Dices}
        className="col-span-3 md:col-span-1"
      />
    </div>
  );
}

function BentoTile({
  name,
  description,
  href,
  cta,
  Icon,
  className,
  accent,
  highlight,
}: {
  name: string;
  description: string;
  href: string;
  cta: string;
  Icon: LucideIcon;
  className: string;
  accent: "loto" | "accent";
  highlight?: React.ReactNode;
}) {
  const bg =
    accent === "loto"
      ? "bg-linear-to-br from-loto/10 via-surface to-surface"
      : "bg-linear-to-br from-accent/10 via-surface to-euro/5";

  return (
    <article
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface",
        className,
      )}
    >
      <div className={cn("relative min-h-[5rem] flex-1 p-4", bg)}>
        {highlight ? <div className="flex flex-col gap-1">{highlight}</div> : null}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Icon className="size-9 text-accent/80" aria-hidden />
        <h3 className="text-lg font-semibold text-ink">{name}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        <Button variant="link" asChild size="sm" className="h-auto justify-start p-0 text-accent">
          <Link href={href as Route}>
            {cta}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function FeatureTile({
  name,
  description,
  Icon,
  className,
  href = "/loto",
}: {
  name: string;
  description: string;
  Icon: LucideIcon;
  className: string;
  href?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4",
        className,
      )}
    >
      <Icon className="size-5 text-muted" aria-hidden />
      <h3 className="text-sm font-semibold text-ink">{name}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      <Link href={href as Route} className="text-xs font-medium text-accent hover:underline">
        En savoir plus →
      </Link>
    </article>
  );
}
