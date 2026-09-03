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
    <div className="grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[17rem]">
      <BentoTile
        name="Tirages FDJ"
        description="TRJ, espérance de gain et tests d'uniformité sur l'historique officiel."
        href="/loto"
        cta="Voir les probabilités"
        Icon={Dices}
        className="md:col-span-2"
        accent="loto"
        highlight={
          <>
            <span className="text-label text-loto">TRJ Loto</span>
            <span className="tnum text-4xl font-bold tracking-tight text-loto">{trjLabel}</span>
          </>
        }
      />

      <BentoTile
        name="Modèles sport"
        description="Dixon–Coles, Elo NBA et confrontation systématique au marché."
        href="/sports"
        cta="Ouvrir les modèles"
        Icon={LineChart}
        className="md:col-span-1"
        accent="accent"
      />

      <FeatureTile
        name="Test d'uniformité"
        description={
          drawCount
            ? `χ² sur ${drawCount.toLocaleString("fr-FR")} tirages importés.`
            : "χ² sur l'historique officiel FDJ."
        }
        Icon={ShieldCheck}
      />
      <FeatureTile
        name="Espérance de gain"
        description={`Rang 1 : 1 chance sur ${rank1OddsLabel}.`}
        Icon={Calculator}
      />
      <FeatureTile
        name="Systèmes réducteurs"
        description="Le plus petit nombre de grilles pour une garantie donnée."
        Icon={BarChart3}
      />
      <FeatureTile
        name="Buts attendus"
        description="Intensités d'attaque et défense ajustées dans le temps."
        Icon={TrendingUp}
        href="/sports"
      />
      <FeatureTile
        name="Écart au marché"
        description="Marge retirée, mise Kelly fractionné si value."
        Icon={TrendingUp}
        href="/sports/scan"
      />
      <FeatureTile
        name="Combinaisons"
        description={`${combinationsLabel} grilles possibles au rang 1.`}
        Icon={Dices}
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
  className?: string;
  accent: "loto" | "accent";
  highlight?: React.ReactNode;
}) {
  const gradient =
    accent === "loto"
      ? "from-loto/12 via-surface to-surface"
      : "from-accent/12 via-surface to-euro/8";

  return (
    <Link
      href={href as Route}
      className={cn(
        "elevated elevated-hover group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface",
        className,
      )}
    >
      <div className={cn("relative min-h-[6rem] flex-1 bg-linear-to-br p-5", gradient)}>
        {highlight ? <div className="flex flex-col gap-1">{highlight}</div> : null}
      </div>
      <div className="flex flex-col gap-2.5 p-5">
        <div className="icon-box size-10">
          <Icon className="size-5" aria-hidden />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-ink">{name}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
          {cta}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function FeatureTile({
  name,
  description,
  Icon,
  href = "/loto",
}: {
  name: string;
  description: string;
  Icon: LucideIcon;
  href?: string;
}) {
  return (
    <Link
      href={href as Route}
      className="elevated elevated-hover group flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface p-4"
    >
      <div className="icon-box size-8 bg-subtle text-muted">
        <Icon className="size-4" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-ink">{name}</h3>
      <p className="flex-1 text-sm leading-relaxed text-muted">{description}</p>
      <span className="text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
        Explorer →
      </span>
    </Link>
  );
}
