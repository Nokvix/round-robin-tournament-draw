// Общие размеры инструкции и окон со списками игроков.
export const dialogLayout = {
  "& .MuiDialog-container": { alignItems: "flex-start" },
  "& .MuiDialog-paper": {
    width: { xs: "calc(100vw - 32px)", sm: "50vw" },
    maxWidth: { xs: "calc(100vw - 32px)", sm: "50vw" },
    height: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
    maxHeight: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
    margin: { xs: 2, sm: 4 }
  }
};
