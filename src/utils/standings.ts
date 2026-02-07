import { StandingsRow, Tournament } from "../types";
import { BYE_PLAYER_ID } from "./roundRobin";

export function computeStandings(tournament: Tournament): StandingsRow[] {
  const points = new Map<string, number>();
  const berger = new Map<string, number>();
  const order = new Map<string, number>();

  tournament.players.forEach((player, index) => {
    points.set(player.id, 0);
    berger.set(player.id, 0);
    order.set(player.id, index + 1);
  });

  tournament.rounds.forEach((round) => {
    round.games.forEach((game) => {
      if (game.isBye) {
        return;
      }

      if (!game.result) {
        return;
      }

      if (game.result === "1-0") {
        points.set(game.whitePlayerId, (points.get(game.whitePlayerId) ?? 0) + 1);
      } else if (game.result === "0-1") {
        points.set(game.blackPlayerId, (points.get(game.blackPlayerId) ?? 0) + 1);
      } else if (game.result === "0.5-0.5") {
        points.set(game.whitePlayerId, (points.get(game.whitePlayerId) ?? 0) + 0.5);
        points.set(game.blackPlayerId, (points.get(game.blackPlayerId) ?? 0) + 0.5);
      }
    });
  });

  tournament.rounds.forEach((round) => {
    round.games.forEach((game) => {
      if (game.isBye || !game.result) return;

      const whitePoints = points.get(game.whitePlayerId) ?? 0;
      const blackPoints = points.get(game.blackPlayerId) ?? 0;

      if (game.result === "1-0") {
        berger.set(game.whitePlayerId, (berger.get(game.whitePlayerId) ?? 0) + blackPoints);
      } else if (game.result === "0-1") {
        berger.set(game.blackPlayerId, (berger.get(game.blackPlayerId) ?? 0) + whitePoints);
      } else if (game.result === "0.5-0.5") {
        berger.set(game.whitePlayerId, (berger.get(game.whitePlayerId) ?? 0) + blackPoints * 0.5);
        berger.set(game.blackPlayerId, (berger.get(game.blackPlayerId) ?? 0) + whitePoints * 0.5);
      }
    });
  });

  const rows: StandingsRow[] = tournament.players.map((player) => {
    return {
      playerId: player.id,
      points: points.get(player.id) ?? 0,
      tiebreak1: berger.get(player.id) ?? 0,
      place: 0
    };
  });

  const ranking = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.tiebreak1 !== a.tiebreak1) return b.tiebreak1 - a.tiebreak1;
    return (order.get(a.playerId) ?? 0) - (order.get(b.playerId) ?? 0);
  });

  ranking.forEach((row, index) => {
    row.place = index + 1;
  });

  return rows;
}
