export interface CompetitionInfo {
  label: string;
  country: string;
  flag: string;
}

export const COMPETITIONS: Record<string, CompetitionInfo> = {
  FL1: { label: "Ligue 1", country: "France", flag: "🇫🇷" },
  PL: { label: "Premier League", country: "Angleterre", flag: "🇬🇧" },
  PD: { label: "La Liga", country: "Espagne", flag: "🇪🇸" },
  SA: { label: "Serie A", country: "Italie", flag: "🇮🇹" },
  BL1: { label: "Bundesliga", country: "Allemagne", flag: "🇩🇪" },
  DED: { label: "Eredivisie", country: "Pays-Bas", flag: "🇳🇱" },
  PPL: { label: "Primeira Liga", country: "Portugal", flag: "🇵🇹" },
  CL: { label: "Ligue des champions", country: "Europe", flag: "🇪🇺" },
  NBA: { label: "NBA", country: "États-Unis", flag: "🇺🇸" },
};

/** @deprecated Utiliser COMPETITIONS[code].label */
export const COMPETITION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(COMPETITIONS).map(([code, info]) => [code, info.label]),
);

const COUNTRY_ORDER = [
  "France",
  "Angleterre",
  "Espagne",
  "Italie",
  "Allemagne",
  "Pays-Bas",
  "Portugal",
  "Europe",
  "États-Unis",
];

export function groupCompetitions(codes: string[]) {
  const groups = new Map<string, { code: string; info: CompetitionInfo }[]>();

  for (const code of codes) {
    const info = COMPETITIONS[code] ?? {
      label: code,
      country: "Autre",
      flag: "⚽",
    };
    const list = groups.get(info.country) ?? [];
    list.push({ code, info });
    groups.set(info.country, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.info.label.localeCompare(b.info.label, "fr"));
  }

  return COUNTRY_ORDER.filter((c) => groups.has(c)).map((country) => ({
    country,
    items: groups.get(country)!,
  }));
}

/** Compétition par défaut : Ligue 1 si dispo, sinon la première par ordre alphabétique. */
export function defaultCompetition(codes: string[]): string | undefined {
  if (!codes.length) return undefined;
  if (codes.includes("FL1")) return "FL1";
  return [...codes].sort((a, b) =>
    (COMPETITIONS[a]?.label ?? a).localeCompare(COMPETITIONS[b]?.label ?? b, "fr"),
  )[0];
}
