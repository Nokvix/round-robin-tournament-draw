import { parseTournament } from "./importExport";
import { BYE_PLAYER_ID } from "./roundRobin";
import {
  normalizePlayerName, parseSwmTournament, processRatingFiles,
  RatingDatabase, RatingProcessingResult, SwmPlayer, SwmTournament
} from "./ratingCalculator";

export interface RatingQueueEntry { fileName: string; tournament: SwmTournament }
export interface RatingSession {
  queue: RatingQueueEntry[];
  tournamentIndex: number;
  playerIndex: number;
  result: RatingProcessingResult;
}
export type PlayerSelection = NonNullable<SwmPlayer["databaseMatch"]>;

export function getRatingFileFormat(fileName: string): "smw" | "json" {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "smw" || extension === "json") return extension;
  throw new Error("Поддерживаются только файлы .smw и .json.");
}

export function parseJsonRatingTournament(text: string): SwmTournament {
  const source = parseTournament(text);
  if (typeof source.id !== "string" || typeof source.name !== "string" || !source.name.trim() || source.players.length < 2) {
    throw new Error("Нужны название турнира и хотя бы два игрока.");
  }
  const byId = new Map<string, SwmPlayer>();
  const players = source.players.map((player, index): SwmPlayer => {
    if (!player || typeof player.id !== "string" || !player.id.trim() ||
        player.id === BYE_PLAYER_ID || byId.has(player.id) ||
        typeof player.name !== "string" || !player.name.trim()) {
      throw new Error(`Некорректные имя или ID игрока №${index + 1}.`);
    }
    const participant: SwmPlayer = {
      number: index + 1, startNumber: index + 1, name: player.name,
      fsrId: "", tournamentRating: null, totalScore: 0, games: [], rawLine: ""
    };
    byId.set(player.id, participant);
    return participant;
  });
  const roundNumbers = new Set<number>();
  let unfinished = 0;
  source.rounds.forEach((round) => {
    if (!round || !Number.isInteger(round.roundNumber) || round.roundNumber < 1 ||
        round.roundNumber > source.rounds.length || roundNumbers.has(round.roundNumber) || !Array.isArray(round.games)) {
      throw new Error("Некорректная структура или нумерация туров.");
    }
    roundNumbers.add(round.roundNumber);
    const used = new Set<string>();
    round.games.forEach((game, board) => {
      if (!game || game.roundNumber !== round.roundNumber || typeof game.isBye !== "boolean" ||
          ![null, "1-0", "0-1", "0.5-0.5"].includes(game.result)) {
        throw new Error(`Тур ${round.roundNumber}: некорректная партия или результат.`);
      }
      const white = byId.get(game.whitePlayerId);
      const black = byId.get(game.blackPlayerId);
      const validBye = game.isBye && game.result === null &&
        ((white && game.blackPlayerId === BYE_PLAYER_ID) || (black && game.whitePlayerId === BYE_PLAYER_ID));
      if (game.isBye ? !validBye : (!white || !black || white === black)) {
        throw new Error(`Тур ${round.roundNumber}: неверно указаны участники партии.`);
      }
      for (const id of [game.whitePlayerId, game.blackPlayerId]) {
        if (id === BYE_PLAYER_ID) continue;
        if (used.has(id)) throw new Error(`Тур ${round.roundNumber}: игрок участвует в нескольких партиях.`);
        used.add(id);
      }
      const played = !game.isBye && game.result !== null;
      if (!game.isBye && !played) unfinished += 1;
      const whiteScore = game.result === "1-0" ? 1 : game.result === "0.5-0.5" ? 0.5 : 0;
      const addGame = (player: SwmPlayer | undefined, opponent: SwmPlayer | undefined, color: "W" | "B") => {
        if (!player) return;
        const score = played ? (color === "W" ? whiteScore : 1 - whiteScore) : 0;
        player.totalScore += score;
        player.games.push({ round: round.roundNumber, board: game.isBye ? null : board + 1,
          opponentNumber: opponent?.number ?? null, color: game.isBye ? null : color, score, played, raw: "" });
      };
      addGame(white, black, "W");
      addGame(black, white, "B");
    });
  });
  return {
    name: source.name, playerCount: players.length, roundCount: source.rounds.length, players,
    requiresPlayerConfirmation: true, tiebreak: "berger",
    warnings: unfinished ? [`Партий без результата: ${unfinished}. Они исключены из расчёта.`] : []
  };
}

/** Проверяем всю очередь до первого расчёта и собираем ошибки всех файлов. */
export function prepareRatingSession(database: RatingDatabase, files: Array<{ fileName: string; text: string }>): RatingSession {
  const errors: string[] = [];
  const queue: RatingQueueEntry[] = [];
  files.forEach((file) => {
    try {
      const format = getRatingFileFormat(file.fileName);
      queue.push({ fileName: file.fileName, tournament: format === "json"
        ? parseJsonRatingTournament(file.text) : parseSwmTournament(file.text) });
    } catch (error) {
      errors.push(`${file.fileName}: ${error instanceof Error ? error.message : "Ошибка чтения файла."}`);
    }
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return advanceRatingSession({ queue, tournamentIndex: 0, playerIndex: 0, result: processRatingFiles(database, []) });
}

function advanceRatingSession(session: RatingSession): RatingSession {
  let current = session;
  while (current.tournamentIndex < current.queue.length) {
    const entry = current.queue[current.tournamentIndex];
    if (entry.tournament.requiresPlayerConfirmation && current.playerIndex < entry.tournament.players.length) return current;
    // Сохраняем исходную пакетную обработку SWM, включая найденные по имени связи ID.
    let endIndex = current.tournamentIndex + 1;
    while (endIndex < current.queue.length && !current.queue[endIndex].tournament.requiresPlayerConfirmation) endIndex += 1;
    const next = processRatingFiles(current.result.database, current.queue.slice(current.tournamentIndex, endIndex));
    current = {
      ...current, tournamentIndex: endIndex, playerIndex: 0,
      result: { ...next,
        tournaments: [...current.result.tournaments, ...next.tournaments],
        warnings: [...current.result.warnings, ...next.warnings],
        createdPlayersCount: current.result.createdPlayersCount + next.createdPlayersCount,
        updatedPlayersCount: current.result.updatedPlayersCount + next.updatedPlayersCount }
    };
  }
  return current;
}

export function confirmRatingPlayer(session: RatingSession, selection: PlayerSelection): RatingSession {
  const entry = session.queue[session.tournamentIndex];
  if (!entry?.tournament.requiresPlayerConfirmation || !entry.tournament.players[session.playerIndex]) {
    throw new Error("Нет игрока для подтверждения.");
  }
  if ("rowIndex" in selection) {
    const rowIndex = selection.rowIndex;
    const row = session.result.database.rows[rowIndex];
    if (!Number.isInteger(rowIndex) || !row?.name || row.rating === null) {
      throw new Error("Выберите игрока с корректным рейтингом из базы.");
    }
    if (entry.tournament.players.some((player) => player.databaseMatch &&
        "rowIndex" in player.databaseMatch && player.databaseMatch.rowIndex === rowIndex)) {
      throw new Error("Этот игрок базы уже выбран для другого участника турнира.");
    }
  } else {
    if (!Number.isSafeInteger(selection.newRating) || selection.newRating < 1000 ||
        !selection.name.trim() || /[;\r\n]/.test(selection.name)) {
      throw new Error("Укажите ФИО без точки с запятой и целый начальный рейтинг не ниже 1000.");
    }
    selection = { ...selection, name: selection.name.trim() };
  }
  const players = entry.tournament.players.map((player, index) => index === session.playerIndex
    ? { ...player, databaseMatch: selection } : player);
  const queue = session.queue.map((item, index) => index === session.tournamentIndex
    ? { ...entry, tournament: { ...entry.tournament, players } } : item);
  return advanceRatingSession({ ...session, queue, playerIndex: session.playerIndex + 1 });
}

export function findRatingCandidates(database: RatingDatabase, surname: string) {
  const query = normalizePlayerName(surname);
  if (!query) return [];
  return database.rows.map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => row.normalizedName.split(" ")[0].includes(query));
}
