const MIN_RATING = 1000;
const RATING_COLUMN_INDEX = 4;

export interface RatingDatabaseRow {
  columns: string[];
  id: string;
  name: string;
  normalizedName: string;
  rating: number | null;
  isNew: boolean;
}

export interface RatingDatabase {
  rows: RatingDatabaseRow[];
  newline: string;
  trailingNewline: boolean;
}

export interface SwmGame {
  round: number;
  board: number | null;
  opponentNumber: number | null;
  color: "W" | "B" | null;
  score: number;
  played: boolean;
  raw: string;
}

export interface SwmPlayer {
  number: number;
  startNumber: number;
  name: string;
  tournamentRating: number | null;
  fsrId: string;
  totalScore: number;
  games: SwmGame[];
  rawLine: string;
}

export interface SwmTournament {
  name: string;
  playerCount: number;
  roundCount: number;
  players: SwmPlayer[];
  warnings: string[];
}

export interface RatedGameDetail {
  round: number;
  opponentName: string;
  opponentRating: number;
  score: number;
  expectedScore: number;
  delta: number;
}

export interface PlayerRatingResult {
  id: string;
  name: string;
  oldRating: number;
  newRating: number;
  change: number;
  gamesCount: number;
  skippedGames: number;
  coefficient: number;
  sumDelta: number;
  rawFinalRating: number;
  created: boolean;
  details: RatedGameDetail[];
}

export interface TournamentRatingResult {
  name: string;
  fileName: string;
  playerCount: number;
  ratedGamesCount: number;
  skippedGamesCount: number;
  updatedPlayers: PlayerRatingResult[];
  warnings: string[];
}

export interface RatingProcessingResult {
  database: RatingDatabase;
  csv: string;
  tournaments: TournamentRatingResult[];
  updatedPlayersCount: number;
  createdPlayersCount: number;
  warnings: string[];
}

interface PlayerState {
  row: RatingDatabaseRow;
  created: boolean;
}

interface TournamentParticipant {
  player: SwmPlayer;
  row: RatingDatabaseRow;
  initialRating: number;
  created: boolean;
}

const PD_TABLE = [
  [0, 3, 0.5, 0.5],
  [4, 10, 0.51, 0.49],
  [11, 17, 0.52, 0.48],
  [18, 25, 0.53, 0.47],
  [26, 32, 0.54, 0.46],
  [33, 39, 0.55, 0.45],
  [40, 46, 0.56, 0.44],
  [47, 53, 0.57, 0.43],
  [54, 61, 0.58, 0.42],
  [62, 68, 0.59, 0.41],
  [69, 76, 0.6, 0.4],
  [77, 83, 0.61, 0.39],
  [84, 91, 0.62, 0.38],
  [92, 98, 0.63, 0.37],
  [99, 106, 0.64, 0.36],
  [107, 113, 0.65, 0.35],
  [114, 121, 0.66, 0.34],
  [122, 129, 0.67, 0.33],
  [130, 137, 0.68, 0.32],
  [138, 145, 0.69, 0.31],
  [146, 153, 0.7, 0.3],
  [154, 162, 0.71, 0.29],
  [163, 170, 0.72, 0.28],
  [171, 179, 0.73, 0.27],
  [180, 188, 0.74, 0.26],
  [189, 197, 0.75, 0.25],
  [198, 206, 0.76, 0.24],
  [207, 215, 0.77, 0.23],
  [216, 225, 0.78, 0.22],
  [226, 235, 0.79, 0.21],
  [236, 245, 0.8, 0.2],
  [246, 256, 0.81, 0.19],
  [257, 267, 0.82, 0.18],
  [268, 278, 0.83, 0.17],
  [279, 290, 0.84, 0.16],
  [291, 302, 0.85, 0.15],
  [303, 315, 0.86, 0.14],
  [316, 328, 0.87, 0.13],
  [329, 344, 0.88, 0.12],
  [345, 357, 0.89, 0.11],
  [358, 374, 0.9, 0.1],
  [375, 391, 0.91, 0.09],
  [392, Infinity, 0.92, 0.08]
] as const;

const GAME_TOKEN_PATTERN = /(?:[\^v]?\s*\d{1,2}[WB][10«½=]#\d+|[dv]\s*-\s*[01«½=]\s*--)/gi;

export function normalizePlayerName(name: string): string {
  return name
    .replace(/ё/g, "е")
    .replace(/Ё/g, "Е")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseScore(value: string): number {
  const normalized = value.trim().replace(",", ".").replace(/[«½=]/g, ".5");
  if (normalized === ".5") return 0.5;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRating(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(MIN_RATING, value);
}

export function parseRatingDatabase(csv: string): RatingDatabase {
  const newline = csv.includes("\r\n") ? "\r\n" : "\n";
  const trailingNewline = /(?:\r\n|\n|\r)$/.test(csv);
  const body = trailingNewline ? csv.replace(/(?:\r\n|\n|\r)$/, "") : csv;
  const lines = body.length > 0 ? body.split(/\r\n|\n|\r/) : [];

  const rows = lines.map((line) => {
    const columns = line.split(";");
    const id = columns[0]?.trim() ?? "";
    const name = columns[1]?.trim() ?? "";
    const rating = parseInteger(columns[RATING_COLUMN_INDEX]);

    return {
      columns,
      id,
      name,
      normalizedName: normalizePlayerName(name),
      rating,
      isNew: false
    };
  });

  return { rows, newline, trailingNewline };
}

export function serializeRatingDatabase(database: RatingDatabase): string {
  const body = database.rows.map((row) => row.columns.join(";")).join(database.newline);
  return database.trailingNewline && body.length > 0 ? `${body}${database.newline}` : body;
}

export function parseSwmTournament(text: string): SwmTournament {
  const lines = text.split(/\r\n|\n|\r/);
  const header = lines.find((line) => line.trim().length > 0);
  if (!header) {
    throw new Error("Файл турнира пуст.");
  }

  const headerParts = header.trim().split(/\s+/).map((part) => Number.parseInt(part, 10));
  const playerCount = Number.isFinite(headerParts[0]) ? headerParts[0] : 0;
  const roundCount = Number.isFinite(headerParts[1]) ? headerParts[1] : 0;
  if (playerCount <= 0) {
    throw new Error("Не удалось определить количество игроков в SWM-файле.");
  }

  const warnings: string[] = [];
  const playerLines = lines
    .slice(lines.indexOf(header) + 1)
    .filter((line) => /^\s*\d+\s+\d+\s+/.test(line))
    .slice(0, playerCount);

  if (playerLines.length !== playerCount) {
    warnings.push(`В заголовке указано игроков: ${playerCount}, найдено строк игроков: ${playerLines.length}.`);
  }

  const nameLine = lines.find((line) => line.startsWith("$") && !line.startsWith("$Additional"));
  const name = nameLine ? nameLine.slice(1).trim() : "Турнир без названия";

  const players = playerLines.map((line) => parseSwmPlayerLine(line, warnings));
  return { name, playerCount, roundCount, players, warnings };
}

function parseSwmPlayerLine(line: string, warnings: string[]): SwmPlayer {
  const matches = Array.from(line.matchAll(GAME_TOKEN_PATTERN));
  const firstGameIndex = matches[0]?.index ?? line.length;
  const prefix = line.slice(0, firstGameIndex).trimEnd();
  const games = matches.map((match, index) => parseSwmGame(match[0], index + 1));

  const colorMatch = prefix.match(/\s([WB])\s*$/i);
  const beforeColor = colorMatch ? prefix.slice(0, colorMatch.index).trimEnd() : prefix;
  const scoreMatch = beforeColor.match(/(\d+(?:[«½])?|\d+[,.]5|[«½])\s*$/);
  const totalScore = scoreMatch ? parseScore(scoreMatch[1]) : 0;
  const beforeScore = scoreMatch ? beforeColor.slice(0, scoreMatch.index).trimEnd() : beforeColor;
  const playerMatch = beforeScore.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s+(\d{3,4})(\*)?(.*)$/);

  if (!playerMatch) {
    warnings.push(`Не удалось полностью разобрать строку игрока: ${line}`);
    return {
      number: 0,
      startNumber: 0,
      name: beforeScore.trim(),
      tournamentRating: null,
      fsrId: "",
      totalScore,
      games,
      rawLine: line
    };
  }

  const tail = playerMatch[6].trim();
  const tailNumbers = tail.split(/\s+/).filter((token) => /^\d+$/.test(token));

  return {
    number: Number.parseInt(playerMatch[1], 10),
    startNumber: Number.parseInt(playerMatch[2], 10),
    name: playerMatch[3].replace(/\s+/g, " ").trim(),
    tournamentRating: parseInteger(playerMatch[4]),
    fsrId: tailNumbers.length > 0 ? tailNumbers[tailNumbers.length - 1] : "",
    totalScore,
    games,
    rawLine: line
  };
}

function parseSwmGame(raw: string, round: number): SwmGame {
  const compact = raw.replace(/\s+/g, "");
  const playedMatch = compact.match(/^[\^v]?(\d{1,2})([WB])([10«½=])#(\d+)$/i);
  if (playedMatch) {
    return {
      round,
      board: Number.parseInt(playedMatch[1], 10),
      color: playedMatch[2].toUpperCase() as "W" | "B",
      score: parseScore(playedMatch[3]),
      opponentNumber: Number.parseInt(playedMatch[4], 10),
      played: true,
      raw: raw.trim()
    };
  }

  const noGameMatch = compact.match(/^[dv]-([01«½=])--$/i);
  return {
    round,
    board: null,
    color: null,
    score: noGameMatch ? parseScore(noGameMatch[1]) : 0,
    opponentNumber: null,
    played: false,
    raw: raw.trim()
  };
}

export function getDevelopmentCoefficient(rating: number): number {
  if (rating < 1200) return 60;
  if (rating < 1400) return 50;
  if (rating < 1600) return 40;
  if (rating < 1800) return 35;
  if (rating < 2200) return rating < 2000 ? 30 : 25;
  if (rating < 2400) return 20;
  return 10;
}

export function getExpectedScore(playerRating: number, opponentRating: number): number {
  const diff = Math.abs(playerRating - opponentRating);
  const row = PD_TABLE.find(([from, to]) => diff >= from && diff <= to) ?? PD_TABLE[PD_TABLE.length - 1];
  const [, , higher, lower] = row;
  if (diff <= 3) return 0.5;
  return playerRating >= opponentRating ? higher : lower;
}

export function calculatePlayerRating(
  initialRating: number,
  games: Array<{ score: number; opponentRating: number; round: number; opponentName: string }>
) {
  const coefficient = getDevelopmentCoefficient(initialRating);
  const details = games.map((game) => {
    const expectedScore = getExpectedScore(initialRating, game.opponentRating);
    const delta = game.score - expectedScore;
    return {
      round: game.round,
      opponentName: game.opponentName,
      opponentRating: game.opponentRating,
      score: game.score,
      expectedScore,
      delta
    };
  });
  const sumDelta = details.reduce((sum, game) => sum + game.delta, 0);
  const rawFinalRating = initialRating + sumDelta * coefficient;
  const newRating = Math.max(MIN_RATING, Math.round(rawFinalRating));

  return {
    coefficient,
    details,
    sumDelta,
    rawFinalRating,
    newRating
  };
}

export function processRatingFiles(
  sourceDatabase: RatingDatabase,
  tournaments: Array<{ fileName: string; tournament: SwmTournament }>
): RatingProcessingResult {
  const database = cloneDatabase(sourceDatabase);
  const indexes = buildIndexes(database.rows);
  const tournamentResults: TournamentRatingResult[] = [];
  const warnings: string[] = [];
  let createdPlayersCount = 0;
  let updatedPlayersCount = 0;

  tournaments.forEach(({ fileName, tournament }) => {
    const participants = new Map<number, TournamentParticipant>();
    const tournamentWarnings = [...tournament.warnings];

    tournament.players.forEach((player) => {
      const state = findOrCreatePlayerState(player, database, indexes);
      if (state.created) {
        createdPlayersCount += 1;
      }
      const initialRating = normalizeRating(state.row.rating) ?? normalizeRating(player.tournamentRating) ?? MIN_RATING;
      participants.set(player.number, {
        player,
        row: state.row,
        initialRating,
        created: state.created
      });
    });

    const updatedPlayers: PlayerRatingResult[] = [];
    let ratedGamesCount = 0;
    let skippedGamesCount = 0;

    participants.forEach((participant) => {
      const gamesForCalculation: Array<{
        score: number;
        opponentRating: number;
        round: number;
        opponentName: string;
      }> = [];
      let playerSkippedGames = 0;

      participant.player.games.forEach((game) => {
        if (!game.played || game.opponentNumber === null) {
          skippedGamesCount += 1;
          playerSkippedGames += 1;
          return;
        }

        const opponent = participants.get(game.opponentNumber);
        if (!opponent) {
          const message = `${participant.player.name}: соперник №${game.opponentNumber} в туре ${game.round} не найден.`;
          tournamentWarnings.push(message);
          skippedGamesCount += 1;
          playerSkippedGames += 1;
          return;
        }

        gamesForCalculation.push({
          score: game.score,
          opponentRating: opponent.initialRating,
          round: game.round,
          opponentName: opponent.player.name
        });
      });

      if (gamesForCalculation.length === 0) {
        return;
      }

      const oldRating = participant.initialRating;
      const calculation = calculatePlayerRating(oldRating, gamesForCalculation);
      setRowRating(participant.row, calculation.newRating);
      updatedPlayersCount += 1;
      ratedGamesCount += gamesForCalculation.length;

      updatedPlayers.push({
        id: participant.player.fsrId || participant.row.id,
        name: participant.player.name,
        oldRating,
        newRating: calculation.newRating,
        change: calculation.newRating - oldRating,
        gamesCount: gamesForCalculation.length,
        skippedGames: playerSkippedGames,
        coefficient: calculation.coefficient,
        sumDelta: calculation.sumDelta,
        rawFinalRating: calculation.rawFinalRating,
        created: participant.created,
        details: calculation.details
      });
    });

    tournamentResults.push({
      name: tournament.name,
      fileName,
      playerCount: tournament.players.length,
      ratedGamesCount,
      skippedGamesCount,
      updatedPlayers: updatedPlayers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
      warnings: tournamentWarnings
    });
    warnings.push(...tournamentWarnings.map((warning) => `${fileName}: ${warning}`));
  });

  const csv = serializeRatingDatabase(database);
  return {
    database,
    csv,
    tournaments: tournamentResults,
    updatedPlayersCount,
    createdPlayersCount,
    warnings
  };
}

function cloneDatabase(database: RatingDatabase): RatingDatabase {
  return {
    newline: database.newline,
    trailingNewline: database.trailingNewline,
    rows: database.rows.map((row) => ({
      ...row,
      columns: [...row.columns]
    }))
  };
}

function buildIndexes(rows: RatingDatabaseRow[]) {
  const byId = new Map<string, RatingDatabaseRow>();
  const byName = new Map<string, RatingDatabaseRow[]>();

  rows.forEach((row) => {
    if (row.id) byId.set(row.id, row);
    if (row.normalizedName) {
      const list = byName.get(row.normalizedName) ?? [];
      list.push(row);
      byName.set(row.normalizedName, list);
    }
  });

  return { byId, byName };
}

function findOrCreatePlayerState(
  player: SwmPlayer,
  database: RatingDatabase,
  indexes: ReturnType<typeof buildIndexes>
): PlayerState {
  if (player.fsrId) {
    const byId = indexes.byId.get(player.fsrId);
    if (byId) return { row: byId, created: false };
  }

  const normalizedName = normalizePlayerName(player.name);
  const exactNameMatches = indexes.byName.get(normalizedName) ?? [];
  if (exactNameMatches.length === 1) {
    const row = exactNameMatches[0];
    if (player.fsrId) indexes.byId.set(player.fsrId, row);
    return { row, created: false };
  }

  const prefixMatches = findUniquePrefixNameMatch(normalizedName, indexes.byName);
  if (prefixMatches) {
    if (player.fsrId) indexes.byId.set(player.fsrId, prefixMatches);
    return { row: prefixMatches, created: false };
  }

  const initialRating = normalizeRating(player.tournamentRating) ?? MIN_RATING;
  const row = createDatabaseRow(player, initialRating);
  database.rows.push(row);
  if (row.id) indexes.byId.set(row.id, row);
  if (row.normalizedName) {
    indexes.byName.set(row.normalizedName, [row]);
  }

  return { row, created: true };
}

function findUniquePrefixNameMatch(
  normalizedName: string,
  byName: Map<string, RatingDatabaseRow[]>
): RatingDatabaseRow | null {
  if (!normalizedName) return null;

  const matches: RatingDatabaseRow[] = [];
  byName.forEach((rows, name) => {
    if (name.startsWith(normalizedName) || normalizedName.startsWith(name)) {
      matches.push(...rows);
    }
  });

  return matches.length === 1 ? matches[0] : null;
}

function createDatabaseRow(player: SwmPlayer, rating: number): RatingDatabaseRow {
  const columns = [player.fsrId, player.name.padEnd(35, " "), "", "", String(rating), "", "", ""];
  return {
    columns,
    id: player.fsrId,
    name: player.name,
    normalizedName: normalizePlayerName(player.name),
    rating,
    isNew: true
  };
}

function setRowRating(row: RatingDatabaseRow, rating: number) {
  while (row.columns.length <= RATING_COLUMN_INDEX) {
    row.columns.push("");
  }
  row.columns[RATING_COLUMN_INDEX] = String(rating);
  row.rating = rating;
}

export function encodeWindows1251(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = encodeWindows1251Char(text.charCodeAt(index));
  }
  return bytes;
}

function encodeWindows1251Char(code: number): number {
  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x044f) return code - 0x0410 + 0xc0;

  const map: Record<number, number> = {
    0x0402: 0x80,
    0x0403: 0x81,
    0x201a: 0x82,
    0x0453: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x20ac: 0x88,
    0x2030: 0x89,
    0x0409: 0x8a,
    0x2039: 0x8b,
    0x040a: 0x8c,
    0x040c: 0x8d,
    0x040b: 0x8e,
    0x040f: 0x8f,
    0x0452: 0x90,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x2122: 0x99,
    0x0459: 0x9a,
    0x203a: 0x9b,
    0x045a: 0x9c,
    0x045c: 0x9d,
    0x045b: 0x9e,
    0x045f: 0x9f,
    0x00a0: 0xa0,
    0x040e: 0xa1,
    0x045e: 0xa2,
    0x0408: 0xa3,
    0x00a4: 0xa4,
    0x0490: 0xa5,
    0x00a6: 0xa6,
    0x00a7: 0xa7,
    0x0401: 0xa8,
    0x00a9: 0xa9,
    0x0404: 0xaa,
    0x00ab: 0xab,
    0x00ac: 0xac,
    0x00ad: 0xad,
    0x00ae: 0xae,
    0x0407: 0xaf,
    0x00b0: 0xb0,
    0x00b1: 0xb1,
    0x0406: 0xb2,
    0x0456: 0xb3,
    0x0491: 0xb4,
    0x00b5: 0xb5,
    0x00b6: 0xb6,
    0x00b7: 0xb7,
    0x0451: 0xb8,
    0x2116: 0xb9,
    0x0454: 0xba,
    0x00bb: 0xbb,
    0x0458: 0xbc,
    0x0405: 0xbd,
    0x0455: 0xbe,
    0x0457: 0xbf
  };

  return map[code] ?? 0x3f;
}
