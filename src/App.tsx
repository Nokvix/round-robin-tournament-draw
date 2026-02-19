import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import ResultsTable from "./components/ResultsTable";
import RoundsList from "./components/RoundsList";
import ResultDialog from "./components/ResultDialog";
import PrintableBergerTable from "./components/PrintableBergerTable";
import PrintableRoundsList from "./components/PrintableRoundsList";
import { Game, Player, Tournament } from "./types";
import { generateRoundRobin } from "./utils/roundRobin";
import { computeStandings } from "./utils/standings";
import { clearTournament, loadLastTournament, saveTournament } from "./utils/storage";
import { parseTournament, serializeTournament } from "./utils/importExport";

const MAX_NAME_LENGTH = 50;
const WARN_AFTER = 32;

function createId(): string {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}`;
}

function parseParticipants(text: string) {
  const raw = text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const seen = new Set<string>();
  const duplicates: string[] = [];
  const tooLong: string[] = [];
  const names: string[] = [];

  raw.forEach((name) => {
    if (name.length > MAX_NAME_LENGTH) {
      tooLong.push(name);
      return;
    }
    if (seen.has(name.toLowerCase())) {
      duplicates.push(name);
      return;
    }
    seen.add(name.toLowerCase());
    names.push(name);
  });

  return { names, duplicates, tooLong };
}

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function App() {
  const stored = useMemo(() => loadLastTournament(), []);
  const [tournament, setTournament] = useState<Tournament | null>(stored);
  const [name, setName] = useState(stored?.name ?? "");
  const [date, setDate] = useState(stored?.date ?? defaultDate());
  const [chiefJudge, setChiefJudge] = useState(stored?.chiefJudge ?? "");
  const [participantsText, setParticipantsText] = useState(
    stored ? stored.players.map((player) => player.name).join("\n") : ""
  );
  const [shufflePlayers, setShufflePlayers] = useState(stored?.shufflePlayers ?? true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dialogGame, setDialogGame] = useState<Game | null>(null);
  const [dialogPlayerId, setDialogPlayerId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"none" | "table" | "rounds">("none");
  const [message, setMessage] = useState<string | null>(null);
  const [placeOverrides, setPlaceOverrides] = useState<Record<string, string>>({});

  const parsed = useMemo(() => parseParticipants(participantsText), [participantsText]);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    tournament?.players.forEach((player) => map.set(player.id, player));
    return map;
  }, [tournament]);

  const playerNumber = useMemo(() => {
    const map = new Map<string, number>();
    tournament?.players.forEach((player, index) => map.set(player.id, index + 1));
    return map;
  }, [tournament]);

  const gamesByPlayerRound = useMemo(() => {
    const map = new Map<string, Map<number, Game>>();
    if (!tournament) return map;

    tournament.rounds.forEach((round) => {
      round.games.forEach((game) => {
        const add = (playerId: string) => {
          if (!map.has(playerId)) map.set(playerId, new Map<number, Game>());
          map.get(playerId)?.set(round.roundNumber, game);
        };
        if (game.whitePlayerId) add(game.whitePlayerId);
        if (game.blackPlayerId) add(game.blackPlayerId);
      });
    });

    return map;
  }, [tournament]);

  const gamesByPlayerOpponent = useMemo(() => {
    const map = new Map<string, Map<string, Game>>();
    if (!tournament) return map;

    tournament.rounds.forEach((round) => {
      round.games.forEach((game) => {
        const add = (playerId: string, opponentId: string) => {
          if (!map.has(playerId)) map.set(playerId, new Map<string, Game>());
          map.get(playerId)?.set(opponentId, game);
        };
        add(game.whitePlayerId, game.blackPlayerId);
        add(game.blackPlayerId, game.whitePlayerId);
      });
    });

    return map;
  }, [tournament]);

  const standings = useMemo(() => (tournament ? computeStandings(tournament) : []), [tournament]);
  const placeValues = useMemo(() => {
    if (!tournament) return new Map<string, string>();
    const map = new Map<string, string>();
    standings.forEach((row) => {
      const defaultPlace = row.place > 0 ? String(row.place) : "";
      map.set(row.playerId, placeOverrides[row.playerId] ?? defaultPlace);
    });
    return map;
  }, [standings, placeOverrides, tournament]);

  const duplicatePlaces = useMemo(() => {
    const seen = new Map<string, number>();
    placeValues.forEach((value) => {
      const key = value.trim();
      if (!key) return;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    return Array.from(seen.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);
  }, [placeValues]);

  const activeGame = useMemo(() => {
    if (!dialogGame || !tournament) return null;
    const round = tournament.rounds.find((item) => item.roundNumber === dialogGame.roundNumber);
    return (
      round?.games.find(
        (game) =>
          game.whitePlayerId === dialogGame.whitePlayerId && game.blackPlayerId === dialogGame.blackPlayerId
      ) ?? null
    );
  }, [dialogGame, tournament]);

  useEffect(() => {
    if (tournament) {
      saveTournament({ ...tournament, updatedAt: new Date().toISOString() });
    }
  }, [tournament]);

  useEffect(() => {
    if (!tournament) return;
    if (tournament.chiefJudge === chiefJudge) return;
    setTournament({ ...tournament, chiefJudge, updatedAt: new Date().toISOString() });
  }, [chiefJudge, tournament]);

  useEffect(() => {
    if (!tournament) return;
    if (tournament.date === date) return;
    setTournament({ ...tournament, date, updatedAt: new Date().toISOString() });
  }, [date, tournament]);

  useEffect(() => {
    if (printMode === "none") {
      document.body.removeAttribute("data-print-mode");
      const existing = document.getElementById("print-page-style");
      if (existing) existing.remove();
      return;
    }
    document.body.setAttribute("data-print-mode", printMode);
    const style = document.createElement("style");
    style.id = "print-page-style";
    style.textContent =
      printMode === "rounds"
        ? "@page { size: A4 portrait; margin: 10mm; }"
        : "@page { size: A4 landscape; margin: 10mm; }";
    const existing = document.getElementById("print-page-style");
    if (existing) existing.remove();
    document.head.appendChild(style);
    const handleAfterPrint = () => setPrintMode("none");
    window.addEventListener("afterprint", handleAfterPrint);
    setTimeout(() => window.print(), 50);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "rounds") {
      document.body.setAttribute("data-print-preview", "rounds");
    }
  }, []);

  const disableGenerate = parsed.names.length < 2 || parsed.duplicates.length > 0 || parsed.tooLong.length > 0;

  const handleGenerate = () => {
    if (disableGenerate) return;
    const orderedNames = shufflePlayers ? shuffleArray(parsed.names) : parsed.names;
    const players = orderedNames.map((playerName) => ({ id: createId(), name: playerName }));
    const now = new Date().toISOString();
    const rounds = generateRoundRobin(players, false);
    const next: Tournament = {
      id: createId(),
      name: name || "Турнир",
      date,
      chiefJudge,
      players,
      shufflePlayers,
      rounds,
      tiebreaksConfig: { type: "berger" },
      createdAt: now,
      updatedAt: now
    };
    setTournament(next);
  };

  const handleReset = () => {
    if (tournament) {
      clearTournament(tournament.id);
    }
    setTournament(null);
    setName("");
    setParticipantsText("");
    setChiefJudge("");
    setShufflePlayers(true);
    setDate(defaultDate());
  };

  const handleExport = () => {
    if (!tournament) return;
    const data = serializeTournament(tournament);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tournament_${tournament.date || "export"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuAnchor(null);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseTournament(text);
      setTournament(data);
      setName(data.name);
      setDate(data.date);
      setChiefJudge(data.chiefJudge ?? "");
      setParticipantsText(data.players.map((p) => p.name).join("\n"));
      setShufflePlayers(data.shufflePlayers);
      setMenuAnchor(null);
      setMessage("Турнир успешно загружен.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить файл.");
    }
  };

  const handleResultChange = (gameToUpdate: Game, result: Game["result"]) => {
    if (!tournament) return;
    const updatedRounds = tournament.rounds.map((round) => {
      if (round.roundNumber !== gameToUpdate.roundNumber) return round;
      return {
        ...round,
        games: round.games.map((game) =>
          game.whitePlayerId === gameToUpdate.whitePlayerId && game.blackPlayerId === gameToUpdate.blackPlayerId
            ? { ...game, result }
            : game
        )
      };
    });
    setTournament({ ...tournament, rounds: updatedRounds, updatedAt: new Date().toISOString() });
  };

  return (
    <Box className="app-shell">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom className="no-print">
          Жеребьёвка турниров по круговой системе
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" className="no-print">
          Быстро создайте турнир, сгенерируйте пары и распечатайте ведомость.
        </Typography>

        <Paper className="section no-print" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Название турнира"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
              />
              <TextField
                label="Дата турнира"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Главный судья"
              value={chiefJudge}
              onChange={(event) => setChiefJudge(event.target.value)}
              fullWidth
            />
            <TextField
              label="Участники"
              placeholder="Введите имена через запятую или с новой строки"
              value={participantsText}
              onChange={(event) => setParticipantsText(event.target.value)}
              multiline
              minRows={4}
              helperText="Ввод участников через запятую или через перенос строки (Enter)."
            />
            {parsed.duplicates.length > 0 && (
              <Alert severity="warning">Дубли имен: {parsed.duplicates.join(", ")}</Alert>
            )}
            {parsed.tooLong.length > 0 && (
              <Alert severity="warning">Слишком длинные имена: {parsed.tooLong.join(", ")}</Alert>
            )}
            {parsed.names.length > WARN_AFTER && (
              <Alert severity="info">Участников больше {WARN_AFTER}. Таблица будет широкой.</Alert>
            )}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <Button variant="contained" onClick={handleGenerate} disabled={disableGenerate}>
                Составить жеребьёвку
              </Button>
              <Button variant="outlined" onClick={handleReset}>
                Сбросить
              </Button>
              <Button variant="text" onClick={(event) => setMenuAnchor(event.currentTarget)}>
                Сохранить / Загрузить
              </Button>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={handleExport}>Сохранить JSON</MenuItem>
                <MenuItem component="label">
                  Загрузить JSON
                  <input
                    hidden
                    type="file"
                    accept="application/json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleImport(file);
                      }
                    }}
                  />
                </MenuItem>
              </Menu>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <Button variant={shufflePlayers ? "contained" : "outlined"} onClick={() => setShufflePlayers((prev) => !prev)}>
                {shufflePlayers ? "Случайное перемешивание включено" : "Случайное перемешивание выключено"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("print", "rounds");
                  window.open(url.toString(), "_blank", "noopener");
                }}
                disabled={!tournament}
              >
                Открыть пары на туры
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {tournament ? (
          <>
            <Paper className="section print-table" sx={{ p: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" className="no-print">
                <Button variant="outlined" onClick={() => setPrintMode("table")}>
                  Печатать таблицу
                </Button>
                <Button variant="outlined" onClick={() => setPrintMode("rounds")}>
                  Печать пар туров
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <ResultsTable
                tournament={tournament}
                standings={standings}
                gamesByPlayerOpponent={gamesByPlayerOpponent}
                playersById={playersById}
                onCellClick={(game, playerId) => {
                  setDialogGame({ ...game });
                  setDialogPlayerId(playerId);
                }}
                placeValues={placeValues}
                onPlaceChange={(playerId, value) =>
                  setPlaceOverrides((prev) => ({ ...prev, [playerId]: value }))
                }
              />
              {duplicatePlaces.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  В столбце «Место» есть одинаковые значения: {duplicatePlaces.join(", ")}.
                </Alert>
              )}
            </Paper>

            <PrintableBergerTable
              tournament={tournament}
              standings={standings}
              gamesByPlayerRound={gamesByPlayerRound}
              placeValues={placeValues}
            />

            <PrintableRoundsList
              rounds={tournament.rounds}
              playersById={playersById}
              title={tournament.name}
              date={tournament.date}
            />

            <Paper className="section print-rounds" sx={{ p: 3 }}>
              <RoundsList rounds={tournament.rounds} playersById={playersById} />
            </Paper>
          </>
        ) : (
          <Paper className="section" sx={{ p: 3 }}>
            <Typography color="text.secondary">Пока нет созданного турнира.</Typography>
          </Paper>
        )}
      </Container>

      <ResultDialog
        open={Boolean(activeGame)}
        game={activeGame}
        playersById={playersById}
        viewPlayerId={dialogPlayerId}
        onClose={() => {
          setDialogGame(null);
          setDialogPlayerId(null);
        }}
        onSave={(result) => {
          if (activeGame) {
            handleResultChange(activeGame, result);
          }
        }}
      />

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        message={message ?? ""}
      />
    </Box>
  );
}
