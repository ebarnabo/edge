/**
 * Configuration des jeux de tirage FDJ.
 * Les URLs d'archives sont les ZIP publics servis par sto.api.fdj.fr
 * (liens présents sur les pages /historique de fdj.fr).
 */

export type GameId = "loto" | "euromillions" | "eurodreams" | "super-loto" | "grand-loto";

export interface GameConfig {
  id: GameId;
  label: string;
  /** Tirage principal : k numéros parmi n */
  main: { pick: number; pool: number };
  /** Numéro complémentaire (Chance / Étoiles / N° Dream) */
  bonus: { pick: number; pool: number; label: string } | null;
  /** Prix d'une grille simple, en euros */
  price: number;
  /** Taux de retour au joueur publié */
  trj: number;
  /** Jours de tirage (0 = dimanche) */
  drawDays: number[];
  archives: string[];
  accent: string;
}

const STO = "https://www.sto.api.fdj.fr/anonymous/service-draw-info/v3/documentations";
const doc = (suffix: string) => `${STO}/1a2b3c4d-9876-4562-b3fc-2c963f66${suffix}`;

export const GAMES: Record<GameId, GameConfig> = {
  loto: {
    id: "loto",
    label: "Loto",
    main: { pick: 5, pool: 49 },
    bonus: { pick: 1, pool: 10, label: "N° Chance" },
    price: 2.2,
    trj: 0.5435, // TRJ applicable depuis le 4 mai 2026
    drawDays: [1, 3, 6],
    archives: [doc("afp6"), doc("afo6"), doc("afn6"), doc("afm6"), doc("afl6")],
    accent: "var(--loto)",
  },
  euromillions: {
    id: "euromillions",
    label: "EuroMillions",
    main: { pick: 5, pool: 50 },
    bonus: { pick: 2, pool: 12, label: "Étoiles" },
    price: 2.5,
    trj: 0.5,
    drawDays: [2, 5],
    archives: [doc("afe6"), doc("afd6"), doc("afc6"), doc("afb6"), doc("afa9"), doc("afa8")],
    accent: "var(--euro)",
  },
  eurodreams: {
    id: "eurodreams",
    label: "EuroDreams",
    main: { pick: 6, pool: 40 },
    bonus: { pick: 1, pool: 5, label: "N° Dream" },
    price: 2.5,
    trj: 0.5,
    drawDays: [1, 4],
    archives: [doc("afa5")],
    accent: "var(--dream)",
  },
  "super-loto": {
    id: "super-loto",
    label: "Super Loto",
    main: { pick: 5, pool: 49 },
    bonus: { pick: 1, pool: 10, label: "N° Chance" },
    price: 3,
    trj: 0.5435,
    drawDays: [],
    archives: [doc("afk6"), doc("afj6"), doc("afi6"), doc("afh6")],
    accent: "var(--loto)",
  },
  "grand-loto": {
    id: "grand-loto",
    label: "Grand Loto",
    main: { pick: 5, pool: 49 },
    bonus: { pick: 1, pool: 10, label: "N° Chance" },
    price: 3,
    trj: 0.5435,
    drawDays: [],
    archives: [doc("afg6"), doc("aff6")],
    accent: "var(--loto)",
  },
};

export const GAME_LIST = Object.values(GAMES);
