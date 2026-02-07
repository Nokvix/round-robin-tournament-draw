import { Box, Typography } from "@mui/material";
import { Game, StandingsRow, Tournament } from "../types";

interface PrintableBergerTableProps {
  tournament: Tournament;
  standings: StandingsRow[];
  gamesByPlayerRound: Map<string, Map<number, Game>>;
  placeValues?: Map<string, string>;
}

function formatScore(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function formatTiebreak(value: number): string {
  return value.toFixed(2);
}

function formatResult(game: Game, playerId: string): string {
  if (!game.result) return "";
  const isWhite = game.whitePlayerId === playerId;
  if (game.result === "0.5-0.5") return "½";
  if (game.result === "1-0") return isWhite ? "1" : "0";
  return isWhite ? "0" : "1";
}

function formatCell(game: Game | undefined, playerId: string): string {
  if (!game || game.isBye) return "";
  return formatResult(game, playerId);
}

function getPrintScale(playersCount: number): number {
  if (playersCount <= 9) return 1;
  if (playersCount <= 11) return 0.92;
  if (playersCount <= 13) return 0.85;
  return 0.78;
}

function formatDateRu(dateValue: string): string {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function PrintableBergerTable({
  tournament,
  standings,
  gamesByPlayerRound,
  placeValues
}: PrintableBergerTableProps) {
  const roundsCount = tournament.rounds.length;
  const standingsMap = new Map(standings.map((row) => [row.playerId, row]));
  const scale = getPrintScale(tournament.players.length);
  const players = tournament.players;

  return (
    <Box className="print-berger print-only" sx={{ "--print-scale": scale } as React.CSSProperties}>
      <Box mb={1} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="h6" fontWeight={600}>
          {tournament.name}
        </Typography>
        <Typography variant="body2">{formatDateRu(tournament.date)}</Typography>
      </Box>

      <div className="print-table-wrapper">
        <table className="print-table-grid">
          <thead>
            <tr>
              <th>№</th>
              <th className="cell-left">Игрок</th>
              {players.map((_, index) => (
                <th key={index}>{index + 1}</th>
              ))}
              <th>Очки</th>
              <th>Доп</th>
              <th>Место</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const row = standingsMap.get(player.id);
              return (
                <tr key={player.id}>
                  <td>{index + 1}</td>
                  <td className="cell-left">{player.name}</td>
                  {players.map((opponent, opponentIndex) => {
                    if (player.id === opponent.id) {
                      return <td key={opponentIndex} className="cell-black"></td>;
                    }
                    const roundsMap = gamesByPlayerRound.get(player.id);
                    let game: Game | undefined;
                    roundsMap?.forEach((candidate) => {
                      if (
                        (candidate.whitePlayerId === player.id && candidate.blackPlayerId === opponent.id) ||
                        (candidate.blackPlayerId === player.id && candidate.whitePlayerId === opponent.id)
                      ) {
                        game = candidate;
                      }
                    });
                    return <td key={opponentIndex}>{formatCell(game, player.id)}</td>;
                  })}
                  <td>{row ? formatScore(row.points) : ""}</td>
                  <td>{row ? formatTiebreak(row.tiebreak1) : ""}</td>
                  <td>{placeValues?.get(player.id) ?? row?.place ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Box mt={1}>
        <Typography variant="body2">Главный судья: {tournament.chiefJudge || ""}</Typography>
      </Box>
    </Box>
  );
}
