import type { GameId } from "./games";

export interface Draw {
  /** ISO yyyy-mm-dd */
  date: string;
  main: number[];
  bonus: number[];
}

export interface GameDataset {
  game: GameId;
  updatedAt: string;
  count: number;
  from: string;
  to: string;
  draws: Draw[]; // du plus récent au plus ancien
}
