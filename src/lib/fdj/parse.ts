import type { Draw } from "./types";

/** Les archives FDJ sont en CSV `;`, encodage Windows-1252, en-têtes variables selon l'époque. */
export function parseFdjCsv(text: string): Draw[] {
  const lines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h));

  const dateIdx = idx(/^date_de_tirage$/) >= 0 ? idx(/^date_de_tirage$/) : idx(/date/);
  const mainIdx = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^boule_\d+$/.test(h))
    .map(({ i }) => i);
  const bonusIdx = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^(numero_chance|etoile_\d+|numero_dream)$/.test(h))
    .map(({ i }) => i);

  if (dateIdx < 0 || mainIdx.length === 0) return [];

  const draws: Draw[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(";");
    const date = normalizeDate(cells[dateIdx]);
    if (!date) continue;

    const main = mainIdx.map((i) => Number(cells[i])).filter(Number.isFinite);
    const bonus = bonusIdx.map((i) => Number(cells[i])).filter(Number.isFinite);
    if (main.length !== mainIdx.length) continue;

    draws.push({ date, main: main.sort((a, b) => a - b), bonus: bonus.sort((a, b) => a - b) });
  }
  return draws;
}

/** `dd/mm/yyyy` ou `yyyymmdd` -> `yyyy-mm-dd` */
function normalizeDate(raw?: string): string | null {
  if (!raw) return null;
  const v = raw.trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
