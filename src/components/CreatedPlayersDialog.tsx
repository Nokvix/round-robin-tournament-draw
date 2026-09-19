import CloseIcon from "@mui/icons-material/Close";
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton,
  List, ListItem, Typography
} from "@mui/material";
import { useMemo, useState } from "react";
import { RatingDatabaseRow } from "../utils/ratingCalculator";
import { dialogLayout } from "./dialogLayout";

export default function CreatedPlayersDialog({ rows }: { rows: RatingDatabaseRow[] }) {
  const [open, setOpen] = useState(false);
  // Берём строки итоговой базы: каждый новый игрок показан один раз,
  // включая участников без сыгранных партий, с рейтингом после всей очереди.
  const players = useMemo(() => rows.filter((row) => row.isNew), [rows]);
  const close = () => setOpen(false);

  return (
    <>
      <Button size="small" className="no-print" disabled={players.length === 0}
        onClick={() => setOpen(true)} aria-label="Просмотреть созданных игроков"
        sx={{ p: 0, mt: 0.5, minWidth: 0, textTransform: "none", textDecoration: "underline" }}>
        Просмотреть
      </Button>
      <Dialog open={open} onClose={close} scroll="paper" maxWidth={false}
        className="no-print" aria-labelledby="created-players-dialog-title" sx={dialogLayout}
        BackdropProps={{ sx: { backgroundColor: "rgba(18, 25, 38, 0.58)", backdropFilter: "blur(4px)" } }}>
        <DialogTitle id="created-players-dialog-title" className="instruction-dialog-title">
          <Typography variant="h5" component="h2" fontWeight={600}>Созданные игроки</Typography>
          <IconButton aria-label="Закрыть список игроков" onClick={close} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers className="instruction-dialog-content" sx={{ overflow: "auto", minHeight: 0 }}>
          <Typography color="text.secondary">
            Добавлено в базу: {players.length}. Рейтинг указан после расчёта всей очереди турниров.
          </Typography>
          <List component="ol" disablePadding sx={{ mt: 2 }}>
            {players.map((player, index) => (
              <ListItem component="li" key={index} disableGutters divider sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5 }}>
                <Typography color="text.secondary" sx={{ flexShrink: 0 }}>{index + 1}.</Typography>
                <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  <Typography fontWeight={600}>{player.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID ФШР: {player.id || "не указан"} · Рейтинг: {player.rating ?? "не указан"}
                  </Typography>
                  {player.columns[7]?.trim() && (
                    <Typography variant="body2" color="text.secondary">Город: {player.columns[7].trim()}</Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
