"use client";

import { cn } from "@/lib/utils";
import type { NumberStat } from "@/lib/loto/stats";

/**
 * Grille de sélection. Chaque case porte deux informations mesurées :
 * l'anneau = écart courant rapporté à l'écart théorique,
 * la teinte = z-score binomial de la fréquence de sortie.
 *
 * Aucune des deux ne prédit le prochain tirage. Elles montrent l'amplitude
 * du bruit que produit un processus parfaitement uniforme.
 */
export function NumberField({
  stats,
  selected,
  onToggle,
  max,
}: {
  stats: NumberStat[];
  selected: number[];
  onToggle: (n: number) => void;
  max: number;
}) {
  const set = new Set(selected);

  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 sm:gap-3">
      {stats.map((s) => {
        const isOn = set.has(s.n);
        const full = !isOn && selected.length >= max;
        const ratio = Math.min(1.6, s.gap / Math.max(1, s.expectedGap));
        const heat = Math.min(1, Math.abs(s.z) / 2.5);

        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onToggle(s.n)}
            disabled={full}
            aria-pressed={isOn}
            aria-label={`Numéro ${s.n}, sorti ${s.count} fois, ${s.gap} tirages d'écart`}
            title={`${s.count} sorties · écart ${s.gap} (théorique ${s.expectedGap.toFixed(1)}) · z = ${s.z.toFixed(2)}`}
            className={cn(
              "group relative flex aspect-square items-center justify-center rounded-[16px] border transition-[transform,border-color,background-color] duration-150",
              "disabled:cursor-not-allowed disabled:opacity-30",
              isOn
                ? "border-loto bg-loto text-base"
                : "border-line/70 bg-raised/50 text-ink hover:not-disabled:-translate-y-0.5 hover:not-disabled:border-line",
            )}
            style={
              isOn
                ? undefined
                : { backgroundColor: `color-mix(in oklch, var(--color-loto) ${heat * 14}%, transparent)` }
            }
          >
            <span className="tnum text-sm font-bold">{s.n}</span>
            {!isOn && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-line/50"
              >
                <span
                  className="block h-full rounded-full bg-loto/70"
                  style={{ width: `${Math.min(100, ratio * 62.5)}%` }}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
