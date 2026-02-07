import { describe, expect, it } from "vitest";
import { Player, Tournament } from "../types";
import { generateRoundRobin } from "./roundRobin";
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
    const rounds = generateRoundRobin(players, false);

    // Round 1: A-D 1-0, B-C 0.5-0.5
    rounds[0].games[0].result = "1-0";
    rounds[0].games[1].result = "0.5-0.5";

    // Round 2: C-A 1-0, B-D 1-0
    rounds[1].games[0].result = "1-0";
    rounds[1].games[1].result = "1-0";

    // Round 3: A-B 0.5-0.5, C-D 0-1
    rounds[2].games[0].result = "0.5-0.5";
    rounds[2].games[1].result = "0-1";

    const tournament: Tournament = {
      id: "t1",
      name: "Test",
      date: "2026-02-07",
      players,
      shufflePlayers: false,
      rounds,
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

    expect(map.get("A")?.tiebreak1).toBe(1.5);
    expect(map.get("B")?.tiebreak1).toBe(1.25);
    expect(map.get("C")?.tiebreak1).toBe(2.0);
    expect(map.get("D")?.tiebreak1).toBe(1.75);
  });
});
