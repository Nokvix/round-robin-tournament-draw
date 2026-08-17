import { describe, expect, it } from "vitest";
import {
  calculatePlayerRating,
  getDevelopmentCoefficient,
  getExpectedScore,
  parseRatingDatabase,
  parseSwmTournament,
  processRatingFiles,
  serializeRatingDatabase
} from "./ratingCalculator";

describe("rating calculator", () => {
  it("выбирает коэффициент развития по начальному рейтингу", () => {
    expect(getDevelopmentCoefficient(1000)).toBe(60);
    expect(getDevelopmentCoefficient(1200)).toBe(50);
    expect(getDevelopmentCoefficient(1400)).toBe(40);
    expect(getDevelopmentCoefficient(1600)).toBe(35);
    expect(getDevelopmentCoefficient(1800)).toBe(30);
    expect(getDevelopmentCoefficient(2000)).toBe(25);
    expect(getDevelopmentCoefficient(2200)).toBe(20);
    expect(getDevelopmentCoefficient(2400)).toBe(10);
  });

  it("берёт PD с правильных границ таблицы", () => {
    expect(getExpectedScore(1600, 1600)).toBe(0.5);
    expect(getExpectedScore(1604, 1600)).toBe(0.51);
    expect(getExpectedScore(1600, 1604)).toBe(0.49);
    expect(getExpectedScore(1992, 1600)).toBe(0.92);
    expect(getExpectedScore(1600, 1992)).toBe(0.08);
  });

  it("считает контрольный пример из правил", () => {
    const result = calculatePlayerRating(1650, [
      { opponentRating: 1600, score: 1, round: 1, opponentName: "A" },
      { opponentRating: 1700, score: 0.5, round: 2, opponentName: "B" },
      { opponentRating: 1900, score: 0, round: 3, opponentName: "C" }
    ]);

    expect(result.sumDelta).toBeCloseTo(0.31);
    expect(result.rawFinalRating).toBeCloseTo(1660.85);
    expect(result.newRating).toBe(1661);
  });

  it("парсит SWM-строки игроков и пропускает партии без игры", () => {
    const tournament = parseSwmTournament(
      [
        "2 2 2 2 0",
        "1   1   Иванов Иван              1600                10  1  W   01W1#2     d   -0--",
        "2   2   Петров Петр             1700                20  0  B   01B0#1     v   -1--",
        "$Тестовый турнир"
      ].join("\n")
    );

    expect(tournament.name).toBe("Тестовый турнир");
    expect(tournament.players).toHaveLength(2);
    expect(tournament.players[0].fsrId).toBe("10");
    expect(tournament.players[0].games[0]).toMatchObject({
      opponentNumber: 2,
      score: 1,
      played: true
    });
    expect(tournament.players[0].games[1]).toMatchObject({
      opponentNumber: null,
      played: false
    });
  });

  it("обрабатывает турнир и обновляет рейтинг в столбце E", () => {
    const database = parseRatingDatabase(
      [
        "10;Иванов Иван                       ;;66;1600;0;01.01.2000;Серов",
        "20;Петров Петр                      ;;66;1700;0;01.01.2000;Серов"
      ].join("\n")
    );
    const tournament = parseSwmTournament(
      [
        "2 1 1 1 0",
        "1   1   Иванов Иван              1600                10  1  W   01W1#2",
        "2   2   Петров Петр             1700                20  0  B   01B0#1",
        "$Тестовый турнир"
      ].join("\n")
    );

    const result = processRatingFiles(database, [{ fileName: "test.smw", tournament }]);
    const rows = result.csv.split("\n");

    expect(rows[0].split(";")[4]).toBe("1622");
    expect(rows[1].split(";")[4]).toBe("1678");
    expect(result.updatedPlayersCount).toBe(2);
    expect(result.createdPlayersCount).toBe(0);
  });

  it("создаёт нового игрока, если его нет в базе", () => {
    const database = parseRatingDatabase("10;Иванов Иван;;;1600;;;");
    const tournament = parseSwmTournament(
      [
        "2 1 1 1 0",
        "1   1   Иванов Иван              1600                10  1  W   01W1#2",
        "2   2   Новый Игрок              1500                30  0  B   01B0#1",
        "$Тестовый турнир"
      ].join("\n")
    );

    const result = processRatingFiles(database, [{ fileName: "test.smw", tournament }]);
    const serialized = serializeRatingDatabase(result.database);

    expect(result.createdPlayersCount).toBe(1);
    expect(serialized).toContain("30;Новый Игрок");
  });
});
