/** Abrège les noms officiels pour l'affichage (PSG FC → PSG). */
const TRAILING_SUFFIX =
  /\s+(Football Club|Futbol Club|Club de Fútbol|CF|FC|AC|AS|SC|US|AFC|CD|RC|RCD|OGC|LOSC|SK|BK|IF)\s*$/i;

export function displayTeamName(name: string): string {
  return name.replace(TRAILING_SUFFIX, "").trim();
}

export function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDayHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatFreshness(iso: string | null): string {
  if (!iso) return "inconnue";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}
