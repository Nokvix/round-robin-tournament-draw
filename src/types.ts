export type GameResult = "1-0" | "0-1" | "0.5-0.5" | null;

export interface Player {
  id: string;
  name: string;
  category?: string;
  notes?: string;
}

export interface Game {
  roundNumber: number;
  whitePlayerId: string;
  blackPlayerId: string;
  result: GameResult;
  isBye: boolean;
}

export interface Round {
  roundNumber: number;
  games: Game[];
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  chiefJudge: string;
  players: Player[];
  shufflePlayers: boolean;
  rounds: Round[];
  tiebreaksConfig: {
    type: "berger";
  };
  createdAt: string;
  updatedAt: string;
}

export interface StandingsRow {
  playerId: string;
  points: number;
  tiebreak1: number;
  tiebreak2?: number;
  place: number;
}
