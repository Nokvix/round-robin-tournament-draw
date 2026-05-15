import { Box, Typography } from "@mui/material";
import { Game, StandingsRow, Tournament } from "../types";

interface PrintableBergerTableProps {
  tournament: Tournament;
  standings: StandingsRow[];
  gamesByPlayerRound: Map<string, Map<number, Game>>;
  placeValues?: Map<string, string>;
}

function formatScore(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function formatTiebreak(value: number): string {
  return value.toFixed(2);
}

function formatResult(game: Game, playerId: string): string {
  if (!game.result) return "";
  const isWhite = game.whitePlayerId === playerId;
  if (game.result === "0.5-0.5") return "½";
  if (game.result === "1-0") return isWhite ? "1" : "0";
  return isWhite ? "0" : "1";
}

function formatCell(game: Game | undefined, playerId: string): string {
  if (!game || game.isBye) return "";
  return formatResult(game, playerId);
}

const PRINT_SQUARE_SIZE_MM = 10;
const PRINT_PLAYER_COLUMN_WIDTH_MM = 58;
const PRINT_PLACE_COLUMN_WIDTH_MM = 18;
const PRINT_PAGE_CONTENT_WIDTH_MM = 270;
const PRINT_PAGE_CONTENT_HEIGHT_MM = 180;
const PRINT_HEADER_HEIGHT_MM = 10;
const PRINT_FOOTER_HEIGHT_MM = 7;
const PRINT_VERTICAL_GAP_MM = 3;
const PRINT_FONT_SIZE_PT = 12;
const PRINT_CELL_PADDING_X_MM = 1.5;

function getPrintLayout(playersCount: number) {
  const squareColumnsCount = playersCount + 1;
  const tableWidth =
    squareColumnsCount * PRINT_SQUARE_SIZE_MM +
    PRINT_PLAYER_COLUMN_WIDTH_MM +
    PRINT_PLACE_COLUMN_WIDTH_MM * 3;
  const tableHeight = (playersCount + 1) * PRINT_SQUARE_SIZE_MM;
  const formWidth = tableWidth;
  const formHeight =
    PRINT_HEADER_HEIGHT_MM +
    PRINT_VERTICAL_GAP_MM +
    tableHeight +
    PRINT_VERTICAL_GAP_MM +
    PRINT_FOOTER_HEIGHT_MM;
  const scale = Math.min(
    1,
    PRINT_PAGE_CONTENT_WIDTH_MM / formWidth,
    PRINT_PAGE_CONTENT_HEIGHT_MM / formHeight
  );

  return {
    scale,
    squareSize: PRINT_SQUARE_SIZE_MM * scale,
    playerColumnWidth: PRINT_PLAYER_COLUMN_WIDTH_MM * scale,
    placeColumnWidth: PRINT_PLACE_COLUMN_WIDTH_MM * scale,
    tableWidth: tableWidth * scale,
    tableHeight: tableHeight * scale,
    formWidth: formWidth * scale,
    formHeight: formHeight * scale,
    headerHeight: PRINT_HEADER_HEIGHT_MM * scale,
    footerHeight: PRINT_FOOTER_HEIGHT_MM * scale,
    verticalGap: PRINT_VERTICAL_GAP_MM * scale,
    fontSize: PRINT_FONT_SIZE_PT * scale,
    cellPaddingX: PRINT_CELL_PADDING_X_MM * scale
  };
}

function formatDateRu(dateValue: string): string {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function PrintableBergerTable({
  tournament,
  standings,
  gamesByPlayerRound,
  placeValues
}: PrintableBergerTableProps) {
  const standingsMap = new Map(standings.map((row) => [row.playerId, row]));
  const layout = getPrintLayout(tournament.players.length);
  const players = tournament.players;

  return (
    <Box
      className="print-berger print-only"
      sx={
        {
          "--print-square-size": `${layout.squareSize}mm`,
          "--print-player-column-width": `${layout.playerColumnWidth}mm`,
          "--print-place-column-width": `${layout.placeColumnWidth}mm`,
          "--print-table-width": `${layout.tableWidth}mm`,
          "--print-table-height": `${layout.tableHeight}mm`,
          "--print-form-width": `${layout.formWidth}mm`,
          "--print-form-height": `${layout.formHeight}mm`,
          "--print-header-height": `${layout.headerHeight}mm`,
          "--print-footer-height": `${layout.footerHeight}mm`,
          "--print-vertical-gap": `${layout.verticalGap}mm`,
          "--print-font-size": `${layout.fontSize}pt`,
          "--print-cell-padding-x": `${layout.cellPaddingX}mm`
        } as React.CSSProperties
      }
    >
      <div className="print-berger-page">
        <Box className="print-berger-header" display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" fontWeight={600}>
            {tournament.name}
          </Typography>
          <Typography variant="body2">{formatDateRu(tournament.date)}</Typography>
        </Box>

        <div className="print-table-wrapper">
          <table className="print-table-grid">
            <colgroup>
              <col className="print-col-square" />
              <col className="print-col-player" />
              {players.map((player) => (
                <col key={player.id} className="print-col-square" />
              ))}
              <col className="print-col-place" />
              <col className="print-col-place" />
              <col className="print-col-place" />
            </colgroup>
            <thead>
              <tr>
                <th className="cell-square">№</th>
                <th className="cell-left cell-player-name">Игрок</th>
                {players.map((_, index) => (
                  <th key={index} className="cell-square cell-round-number">
                    {index + 1}
                  </th>
                ))}
                <th>Очки</th>
                <th>Доп</th>
                <th>Место</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const row = standingsMap.get(player.id);
                return (
                  <tr key={player.id}>
                    <td className="cell-square cell-round-number">{index + 1}</td>
                    <td className="cell-left cell-player-name">{player.name}</td>
                    {players.map((opponent, opponentIndex) => {
                      if (player.id === opponent.id) {
                        return <td key={opponentIndex} className="cell-square cell-result cell-black"></td>;
                      }
                      const roundsMap = gamesByPlayerRound.get(player.id);
                      let game: Game | undefined;
                      roundsMap?.forEach((candidate) => {
                        if (
                          (candidate.whitePlayerId === player.id && candidate.blackPlayerId === opponent.id) ||
                          (candidate.blackPlayerId === player.id && candidate.whitePlayerId === opponent.id)
                        ) {
                          game = candidate;
                        }
                      });
                      return (
                        <td key={opponentIndex} className="cell-square cell-result">
                          {formatCell(game, player.id)}
                        </td>
                      );
                    })}
                    <td>{row && row.place > 0 ? formatScore(row.points) : ""}</td>
                    <td>{row && row.place > 0 ? formatTiebreak(row.tiebreak1) : ""}</td>
                    <td>{placeValues?.get(player.id) ?? row?.place ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Box className="print-berger-footer">
          <Typography variant="body2">Главный судья: {tournament.chiefJudge || ""}</Typography>
        </Box>
      </div>
    </Box>
  );
}
