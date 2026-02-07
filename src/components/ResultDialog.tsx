import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography
} from "@mui/material";
import { Game, Player } from "../types";

interface ResultDialogProps {
  open: boolean;
  game: Game | null;
  playersById: Map<string, Player>;
  viewPlayerId: string | null;
  onClose: () => void;
  onSave: (result: Game["result"]) => void;
}

function mapSelectionToResult(game: Game, viewPlayerId: string, value: string): Game["result"] {
  if (value === "none") return null;
  if (value === "0.5") return "0.5-0.5";

  const viewIsWhite = game.whitePlayerId === viewPlayerId;
  if (value === "1") {
    return viewIsWhite ? "1-0" : "0-1";
  }
  if (value === "0") {
    return viewIsWhite ? "0-1" : "1-0";
  }
  return null;
}

export default function ResultDialog({
  open,
  game,
  playersById,
  viewPlayerId,
  onClose,
  onSave
}: ResultDialogProps) {
  if (!game) return null;

  const white = playersById.get(game.whitePlayerId)?.name ?? "";
  const black = playersById.get(game.blackPlayerId)?.name ?? "";

  const viewId = viewPlayerId ?? game.whitePlayerId;
  const viewIsWhite = viewId === game.whitePlayerId;
  const currentValue = game.result
    ? game.result === "0.5-0.5"
      ? "0.5"
      : game.result === "1-0"
        ? viewIsWhite ? "1" : "0"
        : viewIsWhite ? "0" : "1"
    : "none";

  const labelLeft = playersById.get(viewId)?.name ?? "";
  const opponentId = viewIsWhite ? game.blackPlayerId : game.whitePlayerId;
  const labelRight = playersById.get(opponentId)?.name ?? "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Результат партии</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" mb={2}>
          {labelLeft} — {labelRight}
        </Typography>
        <RadioGroup
          value={currentValue}
          onChange={(event) => {
            if (!game || !viewId) return;
            onSave(mapSelectionToResult(game, viewId, event.target.value));
          }}
        >
          <FormControlLabel value="1" control={<Radio />} label="1" />
          <FormControlLabel value="0" control={<Radio />} label="0" />
          <FormControlLabel value="0.5" control={<Radio />} label="0,5" />
          <FormControlLabel value="none" control={<Radio />} label="Не сыграно" />
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
