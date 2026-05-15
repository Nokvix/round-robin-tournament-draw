import { describe, expect, it } from "vitest";
import { Player, Tournament } from "../types";
import { computeStandings } from "./standings";

function createPlayers(): Player[] {
  return [
    { id: "A", name: "A" },
    { id: "B", name: "B" },
    { id: "C", name: "C" },
    { id: "D", name: "D" }
  ];
}

describe("computeStandings", () => {
  it("подсчитывает очки и коэффициент Бергера", () => {
    const players = createPlayers();

    const tournament: Tournament = {
      id: "t1",
      name: "Test",
      date: "2026-02-07",
      players,
      shufflePlayers: false,
      rounds: [
        {
          roundNumber: 1,
          games: [
            { roundNumber: 1, whitePlayerId: "A", blackPlayerId: "D", result: "1-0", isBye: false },
            { roundNumber: 1, whitePlayerId: "B", blackPlayerId: "C", result: "0.5-0.5", isBye: false }
          ]
        },
        {
          roundNumber: 2,
          games: [
            { roundNumber: 2, whitePlayerId: "C", blackPlayerId: "A", result: "1-0", isBye: false },
            { roundNumber: 2, whitePlayerId: "B", blackPlayerId: "D", result: "1-0", isBye: false }
          ]
        },
        {
          roundNumber: 3,
          games: [
            { roundNumber: 3, whitePlayerId: "A", blackPlayerId: "B", result: "0.5-0.5", isBye: false },
            { roundNumber: 3, whitePlayerId: "C", blackPlayerId: "D", result: "0-1", isBye: false }
          ]
        }
      ],
      tiebreaksConfig: { type: "berger" },
      createdAt: "2026-02-07T00:00:00Z",
      updatedAt: "2026-02-07T00:00:00Z"
    };

    const standings = computeStandings(tournament);
    const map = new Map(standings.map((row) => [row.playerId, row]));

    expect(map.get("A")?.points).toBe(1.5);
    expect(map.get("B")?.points).toBe(2);
    expect(map.get("C")?.points).toBe(1.5);
    expect(map.get("D")?.points).toBe(1);

    expect(map.get("A")?.tiebreak1).toBe(2);
    expect(map.get("B")?.tiebreak1).toBe(2.5);
    expect(map.get("C")?.tiebreak1).toBe(2.5);
    expect(map.get("D")?.tiebreak1).toBe(1.5);
  });
});
