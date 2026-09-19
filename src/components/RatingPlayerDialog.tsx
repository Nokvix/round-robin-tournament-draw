import CloseIcon from "@mui/icons-material/Close";
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useMemo, useState } from "react";
import { findRatingCandidates, PlayerSelection, RatingSession } from "../utils/ratingSession";
import { dialogLayout } from "./dialogLayout";

interface Props {
  session: RatingSession;
  onSelect: (selection: PlayerSelection) => void;
  onCancel: () => void;
  error: string | null;
}

export default function RatingPlayerDialog({ session, onSelect, onCancel, error }: Props) {
  const entry = session.queue[session.tournamentIndex];
  const player = entry.tournament.players[session.playerIndex];
  const [surname, setSurname] = useState(player.name.trim().split(/\s+/)[0]);
  const [selected, setSelected] = useState<number | null>(null);
  const [newName, setNewName] = useState(player.name);
  const [newRating, setNewRating] = useState("");
  const [checkedName, setCheckedName] = useState(false);
  const candidates = useMemo(() => findRatingCandidates(session.result.database, surname), [session.result.database, surname]);
  const usedRows = new Set(entry.tournament.players.flatMap((participant) =>
    participant.databaseMatch && "rowIndex" in participant.databaseMatch ? [participant.databaseMatch.rowIndex] : []));
  const rating = Number(newRating);
  const validNewPlayer = checkedName && newName.trim() && !/[;\r\n]/.test(newName) &&
    newRating.trim() && Number.isSafeInteger(rating) && rating >= 1000;

  return (
    <Dialog open onClose={onCancel} scroll="paper" maxWidth={false} sx={dialogLayout}
      aria-labelledby="rating-player-dialog-title"
      BackdropProps={{ sx: { backgroundColor: "rgba(18, 25, 38, 0.58)", backdropFilter: "blur(4px)" } }}>
      <DialogTitle id="rating-player-dialog-title" sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" variant="h6">Подтверждение игрока</Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            Турнир {session.tournamentIndex + 1} из {session.queue.length}: {entry.tournament.name} ({entry.fileName})
          </Typography>
          <Typography variant="body2">Игрок {session.playerIndex + 1} из {entry.tournament.players.length}</Typography>
        </Box>
        <IconButton aria-label="Прервать обсчёт" onClick={onCancel}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ overflow: "auto", minHeight: 0, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{player.name}</Typography>
          <TextField label="Поиск по фамилии" value={surname} fullWidth
            onChange={(event) => { setSurname(event.target.value); setSelected(null); setCheckedName(false); }}
            helperText="Можно исправить фамилию или ввести её часть. Выберите строку и нажмите «Выбрать»." />
          {error && <Alert severity="error">{error}</Alert>}
          {candidates.length > 0 ? (
            <>
              <Typography variant="body2">Найдено: {candidates.length}. Рейтинги с учётом предыдущих турниров очереди.</Typography>
              <TableContainer sx={{ maxHeight: "35dvh", overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Table stickyHeader size="small" aria-label="Игроки из базы" sx={{ minWidth: 460 }}>
                  <TableHead><TableRow>
                    <TableCell>ID ФШР</TableCell><TableCell>ФИО</TableCell>
                    <TableCell align="right">Рейтинг</TableCell><TableCell>Город</TableCell>
                  </TableRow></TableHead>
                  <TableBody>{candidates.map(({ row, rowIndex }) => {
                    const disabled = usedRows.has(rowIndex) || row.rating === null;
                    return (
                      <TableRow key={rowIndex} hover={!disabled} selected={selected === rowIndex}
                        aria-selected={selected === rowIndex} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
                        onClick={() => { if (!disabled) setSelected(rowIndex); }}
                        onKeyDown={(event) => {
                          if (!disabled && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault(); setSelected(rowIndex);
                          }
                        }}
                        sx={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}>
                        <TableCell>{row.id || "—"}</TableCell>
                        <TableCell sx={{ overflowWrap: "anywhere" }}>
                          {row.name}{usedRows.has(rowIndex) && <Typography variant="caption" display="block">Уже выбран</Typography>}
                        </TableCell>
                        <TableCell align="right">{row.rating ?? "Не указан"}</TableCell>
                        <TableCell>{row.columns[7]?.trim() || "—"}</TableCell>
                      </TableRow>
                    );
                  })}</TableBody>
                </Table>
              </TableContainer>
            </>
          ) : <Alert severity="info">Игроки не найдены. Проверьте правильность написания фамилии.</Alert>}
          <Button variant="contained" disabled={selected === null} onClick={() => {
            if (selected !== null) onSelect({ rowIndex: selected });
          }} sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}>Выбрать</Button>
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Stack spacing={2}>
              <Typography fontWeight={600}>Нужного игрока нет в списке?</Typography>
              <Typography variant="body2">Проверьте фамилию в поиске. Если игрока нет в базе, укажите его ФИО и начальный рейтинг.</Typography>
              <TextField label="ФИО нового игрока" value={newName} fullWidth
                onChange={(event) => { setNewName(event.target.value); setCheckedName(false); }} />
              <TextField label="Начальный рейтинг" type="number" value={newRating} fullWidth
                inputProps={{ min: 1000, step: 1 }} helperText="Целое число не ниже 1000."
                onChange={(event) => setNewRating(event.target.value)} />
              <FormControlLabel control={<Checkbox checked={checkedName} onChange={(event) => setCheckedName(event.target.checked)} />}
                label="Фамилия написана верно, нужного игрока в базе нет" />
              <Button variant="outlined" disabled={!validNewPlayer}
                onClick={() => onSelect({ name: newName, newRating: rating })}>Добавить нового игрока</Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: "column", alignItems: "stretch", gap: 1, flexShrink: 0 }}>
        <Typography variant="caption">Отмена, крестик или Escape сбросят весь текущий расчёт. Новая база не будет создана.</Typography>
        <Button color="error" variant="outlined" onClick={onCancel}>Прервать обсчёт</Button>
      </DialogActions>
    </Dialog>
  );
}
