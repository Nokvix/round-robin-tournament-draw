import { describe, expect, it } from "vitest";
import { GameResult, Tournament } from "../types";
import { serializeTournament } from "./importExport";
import { parseRatingDatabase, parseSwmTournament, processRatingFiles } from "./ratingCalculator";
import { confirmRatingPlayer, findRatingCandidates, getRatingFileFormat, parseJsonRatingTournament, prepareRatingSession } from "./ratingSession";
import { BYE_PLAYER_ID, generateRoundRobin } from "./roundRobin";
import example from "../../example_tournament.json";

function tournament(result: GameResult = "1-0"): Tournament {
  return {
    id: "test", name: "Круговой турнир", date: "2026-09-19", chiefJudge: "",
    players: [{ id: "20", name: "Иванов Иван" }, { id: "local-b", name: "Петров Петр" }],
    shufflePlayers: false, tiebreaksConfig: { type: "berger" }, createdAt: "", updatedAt: "",
    rounds: [{ roundNumber: 1, games: [{ roundNumber: 1, whitePlayerId: "20", blackPlayerId: "local-b", result, isBye: false }] }]
  };
}
const jsonFile = (source = tournament(), fileName = "round.json") => ({ fileName, text: serializeTournament(source) });
const swmFile = {
  fileName: "swiss.smw",
  text: ["2 1 1 1 0",
    "1   1   Иванов Иван              1900                10  1  W   01W1#2",
    "2   2   Петров Петр             2000                20  0  B   01B0#1", "$Швейцарский турнир"].join("\n")
};
const csv = "10;Иванов Иван;;;1600;;;Серов\n20;Петров Петр;;;1700;;;Екатеринбург\n30;Иванов Игорь;;;1800;;;Москва";

describe("импорт JSON для рейтинга", () => {
  it.each(["smw", "SMW", "json", "JSON"])("принимает расширение %s", (extension) => {
    expect(getRatingFileFormat(`file.${extension}`)).toBe(extension.toLowerCase());
  });
  it.each(["file.txt", "file.swm", "file.csv", "file.json.exe", "file"])("отклоняет %s", (name) => {
    expect(() => getRatingFileFormat(name)).toThrow("только файлы .smw и .json");
  });
  it("принимает сохранённый пример проекта и не использует внутренние ID как ID ФШР", () => {
    const parsed = parseJsonRatingTournament(JSON.stringify(example));
    expect(parsed.players).toHaveLength(example.tournament.players.length);
    expect(parsed.roundCount).toBe(example.tournament.rounds.length);
    expect(parsed.players.every((player) => player.fsrId === "")).toBe(true);
    expect(parsed.requiresPlayerConfirmation).toBe(true);
  });
  it.each([
    ["1-0", 1, 0], ["0-1", 0, 1], ["0.5-0.5", 0.5, 0.5]
  ] as const)("переносит результат %s для обеих сторон", (result, white, black) => {
    const parsed = parseJsonRatingTournament(serializeTournament(tournament(result)));
    expect(parsed.players.map((p) => p.totalScore)).toEqual([white, black]);
    expect(parsed.players[0].games[0]).toMatchObject({ score: white, color: "W", opponentNumber: 2, played: true });
    expect(parsed.players[1].games[0]).toMatchObject({ score: black, color: "B", opponentNumber: 1, played: true });
  });
  it("не обсчитывает BYE и партии без результата, не сдвигает номера туров", () => {
    const source = tournament();
    source.players.push({ id: "c", name: "Третий Игрок" });
    source.rounds = generateRoundRobin(source.players, false);
    source.rounds[1].games.find((game) => !game.isBye)!.result = "0.5-0.5";
    const parsed = parseJsonRatingTournament(serializeTournament(source));
    expect(parsed.players.flatMap((p) => p.games).filter((g) => g.played)).toHaveLength(2);
    expect(parsed.players.flatMap((p) => p.games).filter((g) => g.played).every((g) => g.round === 2)).toBe(true);
    expect(parsed.players.flatMap((p) => p.games).filter((g) => g.opponentNumber === null)).toHaveLength(3);
    expect(parsed.warnings[0]).toContain("Партий без результата: 2");
  });
  it.each([
    ["версия", (data: any) => { data.schemaVersion = 999; }],
    ["участники", (data: any) => { data.tournament.players = null; }],
    ["пустое имя", (data: any) => { data.tournament.players[0].name = " "; }],
    ["повторный ID", (data: any) => { data.tournament.players[1].id = "20"; }],
    ["неизвестный соперник", (data: any) => { data.tournament.rounds[0].games[0].blackPlayerId = "missing"; }],
    ["партия с собой", (data: any) => { data.tournament.rounds[0].games[0].blackPlayerId = "20"; }],
    ["неверный результат", (data: any) => { data.tournament.rounds[0].games[0].result = "2-0"; }],
    ["отсутствующий результат", (data: any) => { delete data.tournament.rounds[0].games[0].result; }],
    ["BYE без флага", (data: any) => { data.tournament.rounds[0].games[0].blackPlayerId = BYE_PLAYER_ID; }],
    ["ложный BYE", (data: any) => { data.tournament.rounds[0].games[0].isBye = true; }],
    ["повторная партия", (data: any) => { data.tournament.rounds[0].games.push(data.tournament.rounds[0].games[0]); }],
    ["неверный тур", (data: any) => { data.tournament.rounds[0].roundNumber = 0; }],
    ["отсутствующий тур", (data: any) => { data.tournament.rounds[0] = null; }],
    ["отсутствующие партии", (data: any) => { data.tournament.rounds[0].games = null; }]
  ])("отклоняет повреждение: %s", (_, mutate) => {
    const data = JSON.parse(serializeTournament(tournament()));
    mutate(data);
    expect(() => parseJsonRatingTournament(JSON.stringify(data))).toThrow();
  });
});

describe("последовательный расчёт с подтверждением игроков", () => {
  it("сообщает обо всех повреждённых JSON до обсчёта даже первого SWM", () => {
    const database = parseRatingDatabase(csv);
    const before = structuredClone(database);
    expect(() => prepareRatingSession(database, [swmFile, { fileName: "a.json", text: "{" },
      { fileName: "b.json", text: "{}" }])).toThrow(/a.json:[\s\S]*b.json:/);
    expect(database).toEqual(before);
  });
  it("SWM без JSON даёт прежний результат и приоритет CSV перед рейтингом турнира", () => {
    const database = parseRatingDatabase(csv);
    const session = prepareRatingSession(database, [swmFile, swmFile]);
    expect(session.tournamentIndex).toBe(2);
    expect(session.result).toEqual(processRatingFiles(database, [swmFile, swmFile].map((file) => ({
      fileName: file.fileName, tournament: parseSwmTournament(file.text)
    }))));
    expect(session.result.tournaments[0].updatedPlayers.find((p) => p.id === "10")?.oldRating).toBe(1600);
  });
  it("JSON считает тем же алгоритмом, ждёт каждого подтверждения и не путает ID с ФШР", () => {
    const database = parseRatingDatabase(csv);
    let session = prepareRatingSession(database, [jsonFile()]);
    expect(session.result.tournaments).toHaveLength(0);
    expect(() => processRatingFiles(database, session.queue)).toThrow("Подтвердите всех игроков");
    session = confirmRatingPlayer(session, { rowIndex: 0 });
    expect(session.playerIndex).toBe(1);
    expect(session.result.tournaments).toHaveLength(0);
    session = confirmRatingPlayer(session, { rowIndex: 1 });
    expect(session.tournamentIndex).toBe(1);
    const swm = prepareRatingSession(database, [swmFile]);
    expect(session.result.csv).toBe(swm.result.csv);
    expect(session.result.database.rows.map((r) => r.rating)).toEqual([1622, 1678, 1800]);
  });
  it("сохраняет сопоставления ID по имени между последовательными SWM", () => {
    const database = parseRatingDatabase(csv);
    const first = { ...swmFile, text: swmFile.text.replace("10  1", "99  1") };
    const second = { ...first, text: first.text.replace("Иванов Иван", "Новая Фамилия") };
    const session = prepareRatingSession(database, [first, second]);
    const expected = processRatingFiles(database, [first, second].map((file) => ({
      fileName: file.fileName, tournament: parseSwmTournament(file.text)
    })));
    expect(session.result).toEqual(expected);
    expect(session.result.createdPlayersCount).toBe(0);
  });
  it("использует выбранную строку среди однофамильцев и запрещает выбирать её дважды", () => {
    const database = parseRatingDatabase(csv);
    let session = prepareRatingSession(database, [jsonFile()]);
    session = confirmRatingPlayer(session, { rowIndex: 2 });
    expect(() => confirmRatingPlayer(session, { rowIndex: 2 })).toThrow("уже выбран");
    expect(() => confirmRatingPlayer(session, { rowIndex: 99 })).toThrow("корректным рейтингом");
    session = confirmRatingPlayer(session, { rowIndex: 1 });
    expect(session.result.database.rows[0].rating).toBe(1600);
    expect(session.result.tournaments[0].updatedPlayers.find((p) => p.id === "30")?.oldRating).toBe(1800);
  });
  it("повторяет подтверждение для каждого JSON и показывает рейтинг после предыдущих турниров", () => {
    let session = prepareRatingSession(parseRatingDatabase(csv), [swmFile, jsonFile(), jsonFile()]);
    expect(session.tournamentIndex).toBe(1);
    expect(findRatingCandidates(session.result.database, "Иванов")[0].row.rating).toBe(1622);
    session = confirmRatingPlayer(confirmRatingPlayer(session, { rowIndex: 0 }), { rowIndex: 1 });
    expect(session.tournamentIndex).toBe(2);
    expect(session.playerIndex).toBe(0);
    expect(session.queue[2].tournament.players.every((p) => !p.databaseMatch)).toBe(true);
    const previous = session.result.database.rows[0].rating;
    session = confirmRatingPlayer(confirmRatingPlayer(session, { rowIndex: 0 }), { rowIndex: 1 });
    expect(session.tournamentIndex).toBe(3);
    expect(session.result.tournaments[2].updatedPlayers.find((p) => p.id === "10")?.oldRating).toBe(previous);
  });
  it("явно добавляет нового игрока, даже при совпадении имени, и предлагает его в следующем JSON", () => {
    let session = prepareRatingSession(parseRatingDatabase(csv), [jsonFile(), jsonFile()]);
    session = confirmRatingPlayer(session, { name: "Иванов Иван", newRating: 1200 });
    session = confirmRatingPlayer(session, { rowIndex: 1 });
    expect(session.result.createdPlayersCount).toBe(1);
    expect(session.result.database.rows[0].rating).toBe(1600);
    const added = session.result.database.rows[3];
    expect(added.id).toBe("");
    expect(added.rating).toBeGreaterThan(1200);
    expect(findRatingCandidates(session.result.database, "Иванов").map((c) => c.rowIndex)).toContain(3);
    session = confirmRatingPlayer(confirmRatingPlayer(session, { rowIndex: 3 }), { rowIndex: 1 });
    expect(session.result.createdPlayersCount).toBe(1);
    expect(session.result.database.rows).toHaveLength(4);
  });
  it.each([0, 999, 1200.5, NaN, Infinity])("не принимает некорректный начальный рейтинг %s", (newRating) => {
    const session = prepareRatingSession(parseRatingDatabase(csv), [jsonFile()]);
    expect(() => confirmRatingPlayer(session, { name: "Новый Игрок", newRating })).toThrow("начальный рейтинг");
  });
  it("сохраняет исходную базу при отмене в следующем JSON и начинает повторный запуск с нуля", () => {
    const database = parseRatingDatabase(csv);
    const before = structuredClone(database);
    const files = [swmFile, jsonFile(), jsonFile()];
    let discarded = prepareRatingSession(database, files);
    discarded = confirmRatingPlayer(confirmRatingPlayer(discarded, { name: "Новый Игрок", newRating: 1500 }), { rowIndex: 1 });
    discarded = confirmRatingPlayer(discarded, { rowIndex: 0 });
    expect(discarded.result.createdPlayersCount).toBe(1);
    expect(database).toEqual(before);
    const restarted = prepareRatingSession(database, files);
    expect(restarted.tournamentIndex).toBe(1);
    expect(restarted.playerIndex).toBe(0);
    expect(restarted.result.createdPlayersCount).toBe(0);
    expect(restarted.result.database.rows).toHaveLength(3);
    expect(restarted.result.database.rows[0].rating).toBe(1622);
  });
  it("ищет по фамилии с нормализацией регистра и ё, поддерживает пустой ID", () => {
    const database = parseRatingDatabase(";Фёдоров Иван;;;1500;;;Серов\n12;Федоров Петр;;;1600;;;Москва");
    expect(findRatingCandidates(database, "  ФЁДОРОВ ")).toHaveLength(2);
    expect(findRatingCandidates(database, "Петр")).toHaveLength(0);
    expect(findRatingCandidates(database, "")).toHaveLength(0);
  });
});
