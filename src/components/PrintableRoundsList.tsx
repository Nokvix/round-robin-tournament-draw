import { Box, Typography } from "@mui/material";
import { Player, Round } from "../types";
import { BYE_PLAYER_ID } from "../utils/roundRobin";

interface PrintableRoundsListProps {
  rounds: Round[];
  playersById: Map<string, Player>;
  title: string;
  date: string;
}

function formatDateRu(dateValue: string): string {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getPairParts(
  whiteId: string,
  blackId: string,
  playersById: Map<string, Player>
) {
  const whiteName = playersById.get(whiteId)?.name ?? "";
  const blackName = playersById.get(blackId)?.name ?? "";
  const left = whiteId === BYE_PLAYER_ID ? "свободен" : whiteName;
  const right = blackId === BYE_PLAYER_ID ? "свободен" : blackName;
  return { left, right };
}

export default function PrintableRoundsList({
  rounds,
  playersById,
  title,
  date
}: PrintableRoundsListProps) {
  return (
    <Box className="print-rounds-only print-only">
      <Box mb={1}>
        <Typography variant="h6" fontWeight={600} className="rounds-heading">
          {title}
        </Typography>
        <Typography variant="body2" className="rounds-date">
          {formatDateRu(date)}
        </Typography>
      </Box>
      <Box className="rounds-list">
        {rounds.map((round) => (
          <Box key={round.roundNumber} className="rounds-block">
            <div className="rounds-title-row">
              <div className="rounds-title-spacer" />
              <Typography variant="subtitle2" className="rounds-title">
                Тур {round.roundNumber}
              </Typography>
              <div className="rounds-title-spacer" />
            </div>
            {round.games.map((game, index) => {
              const parts = getPairParts(game.whitePlayerId, game.blackPlayerId, playersById);
              return (
                <Typography key={index} className="rounds-item">
                  <span className="rounds-left">{parts.left}</span>
                  <span className="rounds-hyphen">-</span>
                  <span className="rounds-right">{parts.right}</span>
                </Typography>
              );
            })}
            <div className="rounds-divider" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
