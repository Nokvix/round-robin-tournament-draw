import { describe, expect, it } from "vitest";
import { generateRoundRobin, BYE_PLAYER_ID } from "./roundRobin";
import { Player } from "../types";

function createPlayers(count: number): Player[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: `p${index + 1}`,
    name: `Игрок ${index + 1}`
  }));
}

describe("generateRoundRobin", () => {
  it("строго совпадает с таблицей Бергера для 6 игроков", () => {
    const players = createPlayers(6);
    const rounds = generateRoundRobin(players, false);
    const asPairs = rounds.map((round) =>
      round.games.map((game) => `${game.whitePlayerId}-${game.blackPlayerId}`)
    );

    expect(asPairs).toEqual([
      ["p1-p6", "p2-p5", "p3-p4"],
      ["p6-p4", "p5-p3", "p1-p2"],
      ["p2-p6", "p3-p1", "p4-p5"],
      ["p6-p5", "p1-p4", "p2-p3"],
      ["p3-p6", "p4-p2", "p5-p1"]
    ]);
  });

  it("корректно добавляет BYE при нечётном числе игроков", () => {
    const players = createPlayers(5);
    const rounds = generateRoundRobin(players, false);
    expect(rounds.length).toBe(5);

    const byeCount = new Map<string, number>();
    players.forEach((player) => byeCount.set(player.id, 0));

    rounds.forEach((round) => {
      const byeGame = round.games.find((game) => game.isBye);
      expect(byeGame).toBeTruthy();
      const realId = byeGame!.whitePlayerId === BYE_PLAYER_ID ? byeGame!.blackPlayerId : byeGame!.whitePlayerId;
      byeCount.set(realId, (byeCount.get(realId) ?? 0) + 1);
    });

    byeCount.forEach((count) => expect(count).toBe(1));
  });

  it("строго совпадает с таблицей Бергера для 8 игроков", () => {
    const players = createPlayers(8);
    const rounds = generateRoundRobin(players, false);
    const asPairs = rounds.map((round) =>
      round.games.map((game) => `${game.whitePlayerId}-${game.blackPlayerId}`)
    );

    expect(asPairs).toEqual([
      ["p1-p8", "p2-p7", "p3-p6", "p4-p5"],
      ["p8-p5", "p6-p4", "p7-p3", "p1-p2"],
      ["p2-p8", "p3-p1", "p4-p7", "p5-p6"],
      ["p8-p6", "p7-p5", "p1-p4", "p2-p3"],
      ["p3-p8", "p4-p2", "p5-p1", "p6-p7"],
      ["p8-p7", "p1-p6", "p2-p5", "p3-p4"],
      ["p4-p8", "p5-p3", "p6-p2", "p7-p1"]
    ]);
  });
});
