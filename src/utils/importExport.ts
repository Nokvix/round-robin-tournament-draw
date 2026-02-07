import { Tournament } from "../types";

export const SCHEMA_VERSION = 1;

interface ExportPayload {
  schemaVersion: number;
  tournament: Tournament;
}

export function serializeTournament(tournament: Tournament): string {
  const payload: ExportPayload = {
    schemaVersion: SCHEMA_VERSION,
    tournament
  };
  return JSON.stringify(payload, null, 2);
}

export function parseTournament(json: string): Tournament {
  const data = JSON.parse(json) as Partial<ExportPayload>;
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !data.tournament) {
    throw new Error("Неверная версия или структура файла.");
  }

  const t = data.tournament as Tournament;
  if (!t.id || !t.name || !Array.isArray(t.players) || !Array.isArray(t.rounds)) {
    throw new Error("Файл турнира повреждён.");
  }

  return t;
}
