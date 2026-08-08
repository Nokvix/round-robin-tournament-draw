import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CalculateIcon from "@mui/icons-material/Calculate";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import React, { useMemo, useState } from "react";
import {
  encodeWindows1251,
  parseRatingDatabase,
  parseSwmTournament,
  processRatingFiles,
  PlayerRatingResult,
  RatingProcessingResult,
  SwmGame,
  SwmTournament
} from "../utils/ratingCalculator";

interface LoadedTextFile {
  fileName: string;
  text: string;
  encoding: "UTF-8" | "Windows-1251";
}

async function readTextFile(file: File): Promise<LoadedTextFile> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) {
    return { fileName: file.name, text: utf8, encoding: "UTF-8" };
  }

  const cp1251 = new TextDecoder("windows-1251").decode(buffer);
  return { fileName: file.name, text: cp1251, encoding: "Windows-1251" };
}

function downloadFile(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: "text/csv;charset=windows-1251" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function updatedDatabaseFileName(): string {
  const date = new Date();
  return `Рейт${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}.csv`;
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function decimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function averageOpponentRating(player: PlayerRatingResult): string {
  if (player.details.length === 0) return "";
  const total = player.details.reduce((sum, game) => sum + game.opponentRating, 0);
  return String(Math.round(total / player.details.length));
}

function formatTournamentGame(game: SwmGame | undefined): string {
  if (!game?.played || game.opponentNumber === null || game.color === null) return "—";
  const color = game.color === "W" ? "б" : "ч";
  const score = game.score === 0.5 ? "½" : String(game.score);
  return `${game.opponentNumber}${color}${score}`;
}

interface TournamentDisplayRow {
  player: PlayerRatingResult;
  points: number | null;
  games: SwmGame[];
}

interface TournamentDisplay {
  roundCount: number;
  rows: TournamentDisplayRow[];
}

/**
 * Формирует порядок строк для отображения итогов турнира.
 * Рейтинг не пересчитывается: используются только результаты из SWM-файла.
 */
function orderPlayersByTournamentResult(
  updatedPlayers: PlayerRatingResult[],
  tournament: SwmTournament
): TournamentDisplayRow[] {
  const pointsByNumber = new Map(tournament.players.map((player) => [player.number, player.totalScore]));
  const ranking = tournament.players
    .map((player) => {
      const opponentsPoints = player.games
        .filter((game) => game.played && game.opponentNumber !== null)
        .map((game) => pointsByNumber.get(game.opponentNumber!) ?? 0);
      const buchholz = opponentsPoints.reduce((total, points) => total + points, 0);
      const truncatedBuchholz = opponentsPoints.length > 0 ? buchholz - Math.min(...opponentsPoints) : 0;

      return { player, buchholz, truncatedBuchholz };
    })
    .sort((left, right) => {
      if (right.player.totalScore !== left.player.totalScore) {
        return right.player.totalScore - left.player.totalScore;
      }
      if (right.buchholz !== left.buchholz) return right.buchholz - left.buchholz;
      if (right.truncatedBuchholz !== left.truncatedBuchholz) {
        return right.truncatedBuchholz - left.truncatedBuchholz;
      }
      return left.player.number - right.player.number;
    });

  const resultById = new Map(
    ranking
      .filter(({ player }) => player.fsrId)
      .map(({ player }, index) => [
        player.fsrId,
        { order: index, points: player.totalScore, games: player.games }
      ])
  );
  const resultByName = new Map(
    ranking.map(({ player }, index) => [
      player.name,
      { order: index, points: player.totalScore, games: player.games }
    ])
  );

  return updatedPlayers
    .map((player) => {
      const tournamentResult = resultById.get(player.id) ?? resultByName.get(player.name);
      return {
        player,
        points: tournamentResult?.points ?? null,
        games: tournamentResult?.games ?? [],
        order: tournamentResult?.order ?? Number.MAX_SAFE_INTEGER
      };
    })
    .sort((left, right) => left.order - right.order)
    .map(({ player, points, games }) => ({ player, points, games }));
}

export default function RatingCalculator() {
  const [databaseFile, setDatabaseFile] = useState<LoadedTextFile | null>(null);
  const [tournamentFiles, setTournamentFiles] = useState<LoadedTextFile[]>([]);
  const [result, setResult] = useState<RatingProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCalculate = Boolean(databaseFile) && tournamentFiles.length > 0;

  const topChanges = useMemo(() => {
    if (!result) return [];
    return result.tournaments
      .flatMap((tournament) =>
        tournament.updatedPlayers.map((player) => ({
          ...player,
          tournamentName: tournament.name,
          fileName: tournament.fileName
        }))
      )
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 20);
  }, [result]);

  const tournamentsForDisplay = useMemo(() => {
    if (!result) return [];

    return result.tournaments.map((tournament, index) => {
      const source = tournamentFiles[index];
      if (!source) {
        return {
          roundCount: 0,
          rows: tournament.updatedPlayers.map((player) => ({ player, points: null, games: [] }))
        } satisfies TournamentDisplay;
      }

      const parsedTournament = parseSwmTournament(source.text);
      return {
        roundCount: parsedTournament.roundCount,
        rows: orderPlayersByTournamentResult(tournament.updatedPlayers, parsedTournament)
      } satisfies TournamentDisplay;
    });
  }, [result, tournamentFiles]);

  const handleDatabaseUpload = async (file: File) => {
    try {
      setDatabaseFile(await readTextFile(file));
      setResult(null);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить базу.");
    }
  };

  const removeDatabase = () => {
    setDatabaseFile(null);
    setResult(null);
    setError(null);
  };

  const reset = () => {
    setDatabaseFile(null);
    setTournamentFiles([]);
    setResult(null);
    setError(null);
  };

  const handleTournamentsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const loadedFiles = await Promise.all(Array.from(files).map((file) => readTextFile(file)));
      setTournamentFiles((prev) => [...prev, ...loadedFiles]);
      setResult(null);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить файлы турниров.");
    }
  };

  const moveTournament = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tournamentFiles.length) return;
    setTournamentFiles((prev) => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setResult(null);
  };

  const removeTournament = (index: number) => {
    setTournamentFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setResult(null);
  };

  const handleCalculate = () => {
    if (!databaseFile) return;

    try {
      const database = parseRatingDatabase(databaseFile.text);
      const tournaments = tournamentFiles.map((file) => ({
        fileName: file.fileName,
        tournament: parseSwmTournament(file.text)
      }));
      setResult(processRatingFiles(database, tournaments));
      setError(null);
    } catch (calculateError) {
      setResult(null);
      setError(calculateError instanceof Error ? calculateError.message : "Не удалось выполнить расчёт.");
    }
  };

  const handleDownload = () => {
    if (!result || !databaseFile) return;
    downloadFile(encodeWindows1251(result.csv), updatedDatabaseFileName());
  };

  return (
    <>
      <Typography variant="h4" fontWeight={600} gutterBottom className="no-print">
        Обсчёт российского шахматного рейтинга
      </Typography>

      <Paper className="section no-print" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
              Загрузить базу CSV
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleDatabaseUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </Button>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Добавить турниры SWM
              <input
                hidden
                multiple
                type="file"
                accept=".swm,.smw,text/plain"
                onChange={(event) => {
                  handleTournamentsUpload(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CalculateIcon />}
              disabled={!canCalculate}
              onClick={handleCalculate}
            >
              Рассчитать
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={!result}
              onClick={handleDownload}
            >
              Скачать новую базу
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RestartAltIcon />}
              disabled={!databaseFile && tournamentFiles.length === 0 && !result && !error}
              onClick={reset}
            >
              Сбросить
            </Button>
          </Stack>

          {databaseFile ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Alert severity="success" sx={{ flexGrow: 1 }}>
                База: {databaseFile.fileName} ({databaseFile.encoding})
              </Alert>
              <Tooltip title="Удалить базу">
                <IconButton color="error" onClick={removeDatabase}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Alert severity="info">База игроков не загружена.</Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>

      <Paper className="section no-print" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Очередь турниров</Typography>
          {tournamentFiles.length === 0 ? (
            <Typography color="text.secondary">Файлы турниров не загружены.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={80}>№</TableCell>
                    <TableCell>Файл</TableCell>
                    {/* Столбец кодировки закомментил. Пока он не нужен */}
                    {/* <TableCell width={150}>Кодировка</TableCell> */}
                    <TableCell width={160} align="right">
                      Действия
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tournamentFiles.map((file, index) => (
                    <TableRow key={`${file.fileName}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{file.fileName}</TableCell>
                      {/* <TableCell>{file.encoding}</TableCell> */}
                      <TableCell align="right">
                        <Tooltip title="Поднять">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === 0}
                              onClick={() => moveTournament(index, -1)}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Опустить">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === tournamentFiles.length - 1}
                              onClick={() => moveTournament(index, 1)}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton size="small" onClick={() => removeTournament(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Paper>

      {result && (
        <>
          <Paper className="section" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Итог расчёта</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box className="rating-stat">
                  <Typography variant="body2" color="text.secondary">
                    Турниров
                  </Typography>
                  <Typography variant="h5">{result.tournaments.length}</Typography>
                </Box>
                <Box className="rating-stat">
                  <Typography variant="body2" color="text.secondary">
                    Обновлено игроков
                  </Typography>
                  <Typography variant="h5">{result.updatedPlayersCount}</Typography>
                </Box>
                <Box className="rating-stat">
                  <Typography variant="body2" color="text.secondary">
                    Создано игроков
                  </Typography>
                  <Typography variant="h5">{result.createdPlayersCount}</Typography>
                </Box>
                <Box className="rating-stat">
                  <Typography variant="body2" color="text.secondary">
                    Предупреждений
                  </Typography>
                  <Typography variant="h5">{result.warnings.length}</Typography>
                </Box>
              </Stack>

              {result.warnings.length > 0 && (
                <Alert severity="warning">
                  {result.warnings.slice(0, 5).join(" ")}
                  {result.warnings.length > 5 ? " ..." : ""}
                </Alert>
              )}
            </Stack>
          </Paper>

          <Box className="section">
            {result.tournaments.map((tournament, index) => {
              const tournamentDisplay = tournamentsForDisplay[index];
              const displayRows = tournamentDisplay?.rows ?? [];
              const roundCount = tournamentDisplay?.roundCount ?? 0;

              return (
              <Accordion key={`${tournament.fileName}-${index}`} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ width: "100%" }}>
                    <Typography fontWeight={600}>{tournament.name}</Typography>
                    <Typography color="text.secondary">{tournament.fileName}</Typography>
                    <Typography color="text.secondary">
                      игроков: {tournament.playerCount}, партий в расчёте: {tournament.ratedGamesCount}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 1000 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell align="right">№</TableCell>
                          <TableCell>Имя участника</TableCell>
                          <TableCell align="right">Rнач</TableCell>
                          {Array.from({ length: roundCount }, (_, roundIndex) => (
                            <TableCell key={roundIndex} align="center">
                              Тур {roundIndex + 1}
                            </TableCell>
                          ))}
                          <TableCell align="right">Очки</TableCell>
                          <TableCell align="right">Rср</TableCell>
                          <TableCell align="right">Rнов</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayRows.map(({ player, points, games }, playerIndex) => (
                          <TableRow key={`${player.id}-${player.name}-${playerIndex}`}>
                            <TableCell align="right">{playerIndex + 1}</TableCell>
                            <TableCell>{player.name}</TableCell>
                            <TableCell align="right">{player.oldRating}</TableCell>
                            {Array.from({ length: roundCount }, (_, roundIndex) => (
                              <TableCell key={roundIndex} align="center">
                                {formatTournamentGame(games.find((game) => game.round === roundIndex + 1))}
                              </TableCell>
                            ))}
                            <TableCell align="right">{points === null ? "" : formatPoints(points)}</TableCell>
                            <TableCell align="right">{averageOpponentRating(player)}</TableCell>
                            <TableCell align="right">
                              {player.newRating}{" "}
                              <Box
                                component="span"
                                sx={{ color: player.change > 0 ? "success.main" : player.change < 0 ? "error.main" : "inherit" }}
                              >
                                {signed(player.change)}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
              );
            })}
          </Box>
        </>
      )}
    </>
  );
}
