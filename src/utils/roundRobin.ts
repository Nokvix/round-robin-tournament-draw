import { Game, Player, Round } from "../types";

export const BYE_PLAYER_ID = "__BYE__";

type Pair = [number, number];

function bergerBasePairs(total: number): Pair[][] {
  const rounds: Pair[][] = [];
  for (let round = 1; round <= total - 1; round += 1) {
    const pairs: Pair[] = [];
    for (let i = 1; i <= total / 2; i += 1) {
      if (i === 1) {
        pairs.push([total, round]);
      } else {
        const a = ((round + i - 2) % (total - 1)) + 1;
        const b = ((round - i + total - 1) % (total - 1)) + 1;
        pairs.push([a, b]);
      }
    }
    rounds.push(pairs);
  }
  return rounds;
}

function bergerOrderedPairs(total: number): Pair[][] {
  const base = bergerBasePairs(total);
  const half = Math.ceil((total - 1) / 2);
  const rounds: Pair[][] = [];
  let oddIndex = 0;
  let evenIndex = 0;

  for (let round = 1; round <= total - 1; round += 1) {
    if (round % 2 === 1) {
      const pairs = base[oddIndex].map((pair) => [...pair] as Pair);
      oddIndex += 1;
      const [a, b] = pairs[0];
      pairs[0] = [b, a];
      rounds.push(pairs);
    } else {
      const pairs = base[half + evenIndex].map((pair) => [...pair] as Pair);
      evenIndex += 1;
      rounds.push(pairs);
    }
  }

  return rounds;
}

export function generateRoundRobin(players: Player[], shufflePlayers: boolean): Round[] {
  const ids = players.map((player) => player.id);
  const ordered = shufflePlayers ? shuffleArray(ids) : [...ids];
  if (ordered.length % 2 === 1) {
    ordered.push(BYE_PLAYER_ID);
  }

  const total = ordered.length;
  const roundsCount = total - 1;
  const positionToId = new Map<number, string>();
  ordered.forEach((id, index) => positionToId.set(index + 1, id));

  const orderedPairs = bergerOrderedPairs(total);
  const rounds: Round[] = [];

  for (let roundIndex = 0; roundIndex < roundsCount; roundIndex += 1) {
    const roundNumber = roundIndex + 1;
    const games: Game[] = [];
    const pairs = orderedPairs[roundIndex];

    pairs.forEach(([aPos, bPos]) => {
      const aId = positionToId.get(aPos) ?? BYE_PLAYER_ID;
      const bId = positionToId.get(bPos) ?? BYE_PLAYER_ID;

      if (aId === BYE_PLAYER_ID || bId === BYE_PLAYER_ID) {
        const real = aId === BYE_PLAYER_ID ? bId : aId;
        games.push({
          roundNumber,
          whitePlayerId: real,
          blackPlayerId: BYE_PLAYER_ID,
          result: null,
          isBye: true
        });
      } else {
        games.push({
          roundNumber,
          whitePlayerId: aId,
          blackPlayerId: bId,
          result: null,
          isBye: false
        });
      }
    });

    games.sort((a, b) => Number(a.isBye) - Number(b.isBye));
    rounds.push({ roundNumber, games });
  }

  return rounds;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
