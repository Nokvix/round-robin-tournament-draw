import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { Game, Player, StandingsRow, Tournament } from "../types";

interface ResultsTableProps {
  tournament: Tournament;
  standings: StandingsRow[];
  gamesByPlayerOpponent: Map<string, Map<string, Game>>;
  playersById: Map<string, Player>;
  onCellClick: (game: Game, playerId: string) => void;
  placeValues: Map<string, string>;
  onPlaceChange: (playerId: string, value: string) => void;
}

function formatScore(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function formatTiebreak(value: number): string {
  return value.toFixed(2);
}

function getResultDisplay(game: Game | undefined, playerId: string): string {
  if (!game) return "";
  if (game.isBye) return "—";
  if (!game.result) return "";

  const isWhite = game.whitePlayerId === playerId;
  if (game.result === "0.5-0.5") return "½";
  if (game.result === "1-0") return isWhite ? "1" : "0";
  return isWhite ? "0" : "1";
}

function getOpponentName(game: Game, playerId: string, playersById: Map<string, Player>): string {
  if (game.isBye) return "BYE";
  const opponentId = game.whitePlayerId === playerId ? game.blackPlayerId : game.whitePlayerId;
  return playersById.get(opponentId)?.name ?? "";
}

export default function ResultsTable({
  tournament,
  standings,
  gamesByPlayerOpponent,
  playersById,
  onCellClick,
  placeValues,
  onPlaceChange
}: ResultsTableProps) {
  const players = tournament.players;
  const standingsMap = new Map(standings.map((row) => [row.playerId, row]));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} className="no-print">
        <Typography variant="h6">Таблица результатов</Typography>
      </Box>
      <TableContainer className="table-scroll">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Участник</TableCell>
              {players.map((_, index) => (
                <TableCell key={index} align="center">
                  {index + 1}
                </TableCell>
              ))}
              <TableCell align="center">Очки</TableCell>
              <TableCell align="center">Доп</TableCell>
              <TableCell align="center">Место</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tournament.players.map((player, idx) => {
              const row = standingsMap.get(player.id);
              const opponentMap = gamesByPlayerOpponent.get(player.id);

              return (
                <TableRow key={player.id} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  {players.map((opponent, opponentIndex) => {
                    const isDiagonal = opponent.id === player.id;
                    const game = opponentMap?.get(opponent.id);
                    const display = getResultDisplay(game, player.id);
                    const isBye = game?.isBye ?? false;

                    return (
                      <TableCell
                        key={opponentIndex}
                        align="center"
                        className={`results-cell matrix-cell ${isBye ? "disabled" : ""} ${isDiagonal ? "diagonal" : ""}`}
                        onClick={() => game && !isBye && !isDiagonal && onCellClick(game, player.id)}
                      >
                        <Tooltip
                          title={
                            game
                              ? isDiagonal
                                ? ""
                                : isBye
                                  ? "BYE"
                                  : `Соперник: ${getOpponentName(game, player.id, playersById)}`
                              : ""
                          }
                        >
                          <span>{display}</span>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                  <TableCell align="center">{row ? formatScore(row.points) : ""}</TableCell>
                  <TableCell align="center">{row ? formatTiebreak(row.tiebreak1) : ""}</TableCell>
                  <TableCell align="center">
                    <TextField
                      size="small"
                      value={placeValues.get(player.id) ?? ""}
                      onChange={(event) => onPlaceChange(player.id, event.target.value)}
                      placeholder="—"
                      variant="standard"
                      inputProps={{ style: { textAlign: "center", width: "64px" } }}
                      disabled={!row?.place}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
