"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  Calculator,
  Dices,
  LineChart,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { AnimatedNumber } from "@/components/ui/animated-number";

export function HomeBento({
  trjPercent,
  combinations,
  drawCount,
  rank1Odds,
}: {
  trjPercent: number;
  combinations: number;
  drawCount: number | null;
  rank1Odds: number;
}) {
  return (
    <BentoGrid className="auto-rows-[minmax(11rem,auto)] md:auto-rows-[20rem]">
      <BentoCard
        name="Tirages FDJ"
        description="TRJ, espérance de gain et tests d'uniformité sur l'historique officiel. Chaque rang est calculé avec les vraies combinaisons."
        href="/loto"
        cta="Voir les probabilités"
        Icon={Dices}
        className="col-span-3 lg:col-span-2"
        background={
          <div className="absolute inset-0 bg-linear-to-br from-loto/10 via-transparent to-transparent">
            <DotPattern className="opacity-30 text-loto/40" width={18} height={18} cr={0.7} />
            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
              <span className="text-label text-loto">TRJ Loto</span>
              <span className="tnum text-4xl font-bold text-loto">
                <AnimatedNumber value={trjPercent} decimalPlaces={1} suffix=" %" />
              </span>
            </div>
          </div>
        }
      />

      <BentoCard
        name="Modèles sport"
        description="Dixon–Coles, Elo NBA et confrontation systématique au marché des cotes."
        href="/sports"
        cta="Ouvrir les modèles"
        Icon={LineChart}
        className="col-span-3 lg:col-span-1"
        background={
          <div className="absolute inset-0 bg-linear-to-br from-accent/12 via-transparent to-euro/10">
            <DotPattern glow className="hidden opacity-40 text-accent/30 dark:block" width={16} height={16} cr={0.6} />
            <BorderBeam size={120} duration={8} colorFrom="#529cca" colorTo="#a882ff" borderWidth={1} />
          </div>
        }
      />

      <FeatureBento
        name="Test d'uniformité"
        description={
          drawCount
            ? `χ² sur ${drawCount.toLocaleString("fr-FR")} tirages Loto importés.`
            : "χ² sur l'historique officiel FDJ."
        }
        Icon={ShieldCheck}
        className="col-span-3 md:col-span-1"
      />
      <FeatureBento
        name="Espérance de gain"
        description={`Rang 1 : 1 chance sur ${rank1Odds.toLocaleString("fr-FR")}.`}
        Icon={Calculator}
        className="col-span-3 md:col-span-1"
      />
      <FeatureBento
        name="Systèmes réducteurs"
        description="Le plus petit nombre de grilles pour une garantie donnée."
        Icon={BarChart3}
        className="col-span-3 md:col-span-1"
      />
      <FeatureBento
        name="Buts attendus"
        description="Intensités d'attaque et défense ajustées dans le temps."
        Icon={TrendingUp}
        className="col-span-3 md:col-span-1"
      />
      <FeatureBento
        name="Écart au marché"
        description="Marge retirée, mise Kelly fractionné si value."
        Icon={TrendingUp}
        className="col-span-3 md:col-span-1"
      />
      <FeatureBento
        name="Combinaisons Loto"
        description={`${combinations.toLocaleString("fr-FR")} grilles possibles au rang 1.`}
        Icon={Dices}
        className="col-span-3 md:col-span-1"
      />
    </BentoGrid>
  );
}

function FeatureBento({
  name,
  description,
  Icon,
  className,
}: {
  name: string;
  description: string;
  Icon: LucideIcon;
  className: string;
}) {
  return (
    <BentoCard
      name={name}
      description={description}
      href="/loto"
      cta="En savoir plus"
      Icon={Icon}
      className={className}
      background={
        <div className="absolute inset-0 bg-subtle/30 dark:bg-white/2">
          <DotPattern className="opacity-20 text-ink/20 dark:text-white/15" width={14} height={14} cr={0.5} />
        </div>
      }
    />
  );
}

export { HomeBento as default };
