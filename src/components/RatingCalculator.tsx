import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CalculateIcon from "@mui/icons-material/Calculate";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
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
  RatingProcessingResult
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

function updatedDatabaseFileName(sourceName: string) {
  if (!sourceName) return "rating_database_updated.csv";
  return sourceName.replace(/(\.[^.]+)?$/, "_updated$1");
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function decimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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

  const handleDatabaseUpload = async (file: File) => {
    try {
      setDatabaseFile(await readTextFile(file));
      setResult(null);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить базу.");
    }
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
    downloadFile(encodeWindows1251(result.csv), updatedDatabaseFileName(databaseFile.fileName));
  };

  return (
    <>
      <Typography variant="h4" fontWeight={600} gutterBottom className="no-print">
        Обсчёт российского шахматного рейтинга
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" className="no-print">
        Клиентская обработка базы CSV и турниров Swiss Master без серверной части.
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
          </Stack>

          {databaseFile ? (
            <Alert severity="success">
              База: {databaseFile.fileName} ({databaseFile.encoding})
            </Alert>
          ) : (
            <Alert severity="info">База рейтингов не загружена.</Alert>
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
                    <TableCell width={150}>Кодировка</TableCell>
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
                      <TableCell>{file.encoding}</TableCell>
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

          {topChanges.length > 0 && (
            <Paper className="section" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Крупнейшие изменения
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Игрок</TableCell>
                      <TableCell>Турнир</TableCell>
                      <TableCell align="right">Было</TableCell>
                      <TableCell align="right">Стало</TableCell>
                      <TableCell align="right">Изм.</TableCell>
                      <TableCell align="right">Партий</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topChanges.map((player, index) => (
                      <TableRow key={`${player.fileName}-${player.id}-${player.name}-${index}`}>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>{player.tournamentName}</TableCell>
                        <TableCell align="right">{player.oldRating}</TableCell>
                        <TableCell align="right">{player.newRating}</TableCell>
                        <TableCell align="right">{signed(player.change)}</TableCell>
                        <TableCell align="right">{player.gamesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <Box className="section">
            {result.tournaments.map((tournament, index) => (
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
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Игрок</TableCell>
                          <TableCell align="right">Было</TableCell>
                          <TableCell align="right">Стало</TableCell>
                          <TableCell align="right">Изм.</TableCell>
                          <TableCell align="right">K</TableCell>
                          <TableCell align="right">ΣΔR</TableCell>
                          <TableCell align="right">Партий</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tournament.updatedPlayers.map((player, playerIndex) => (
                          <TableRow key={`${player.id}-${player.name}-${playerIndex}`}>
                            <TableCell>{player.name}</TableCell>
                            <TableCell align="right">{player.oldRating}</TableCell>
                            <TableCell align="right">{player.newRating}</TableCell>
                            <TableCell align="right">{signed(player.change)}</TableCell>
                            <TableCell align="right">{player.coefficient}</TableCell>
                            <TableCell align="right">{decimal(player.sumDelta)}</TableCell>
                            <TableCell align="right">{player.gamesCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </>
      )}
    </>
  );
}
