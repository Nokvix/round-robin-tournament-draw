import { Box, Typography } from "@mui/material";
import { Player, Round } from "../types";
import { BYE_PLAYER_ID } from "../utils/roundRobin";

interface RoundsListProps {
  rounds: Round[];
  playersById: Map<string, Player>;
  className?: string;
}

function formatResult(result: string | null): string {
  if (!result) return "";
  if (result === "0.5-0.5") return "½-½";
  return result;
}

function getPairParts(
  whiteId: string,
  blackId: string,
  playersById: Map<string, Player>,
  result: string | null
) {
  const whiteName = playersById.get(whiteId)?.name ?? "";
  const blackName = playersById.get(blackId)?.name ?? "";

  const left = whiteId === BYE_PLAYER_ID ? "свободен" : `${whiteName}`;
  const right = blackId === BYE_PLAYER_ID ? "свободен" : `${blackName}`;

  const resultParts = result ? formatResult(result).split("-") : [];
  const leftResult = resultParts[0]?.trim() ?? "";
  const rightResult = resultParts[1]?.trim() ?? "";
  return { left, right, leftResult, rightResult };
}

export default function RoundsList({ rounds, playersById, className }: RoundsListProps) {
  return (
    <Box className={className}>
      <Typography variant="h6" className="no-print rounds-heading" mb={1}>
        Пары по турам
      </Typography>
      <Box className="rounds-list">
        {rounds.map((round) => (
          <Box key={round.roundNumber} className="rounds-block">
            <Typography variant="subtitle2" className="rounds-title">
              Тур {round.roundNumber}
            </Typography>
            {round.games.map((game, index) => {
              const parts = getPairParts(
                game.whitePlayerId,
                game.blackPlayerId,
                playersById,
                game.result
              );
              return (
                <div key={index} className="rounds-item">
                  <span className="rounds-left">
                    {parts.left}
                    {parts.leftResult ? ` ${parts.leftResult}` : ""}
                  </span>
                  <span className="rounds-hyphen">-</span>
                  <span className="rounds-right">
                    {parts.rightResult ? `${parts.rightResult} ` : ""}
                    {parts.right}
                  </span>
                </div>
              );
            })}
            <div className="rounds-divider" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
