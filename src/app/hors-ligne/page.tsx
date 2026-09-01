import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Hors ligne — Edge" };

export default function OfflinePage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pas de réseau</h1>
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <p className="max-w-[60ch] leading-relaxed text-muted">
            Les pages déjà consultées restent disponibles. Ce qui a besoin du serveur — génération
            de grilles, systèmes réducteurs, prédictions — attendra la reconnexion.
          </p>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["/", "Vue d'ensemble"],
                ["/loto", "Tirages"],
                ["/budget", "Budget"],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-[var(--radius-pill)] border border-line px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-raised"
              >
                {label}
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted">
            Le suivi de budget fonctionne entièrement hors ligne : les saisies restent dans ton
            navigateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
