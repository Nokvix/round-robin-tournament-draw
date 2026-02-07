import { Tournament } from "../types";
import { parseTournament, serializeTournament } from "./importExport";

const LAST_ID_KEY = "rrd:lastTournamentId";
const PREFIX = "rrd:tournament:";

export function saveTournament(tournament: Tournament): void {
  localStorage.setItem(`${PREFIX}${tournament.id}`, serializeTournament(tournament));
  localStorage.setItem(LAST_ID_KEY, tournament.id);
}

export function loadLastTournament(): Tournament | null {
  const lastId = localStorage.getItem(LAST_ID_KEY);
  if (!lastId) return null;
  const raw = localStorage.getItem(`${PREFIX}${lastId}`);
  if (!raw) return null;
  try {
    return parseTournament(raw);
  } catch {
    return null;
  }
}

export function clearTournament(tournamentId?: string): void {
  if (tournamentId) {
    localStorage.removeItem(`${PREFIX}${tournamentId}`);
  }
  localStorage.removeItem(LAST_ID_KEY);
}
