import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography
} from "@mui/material";
import { ReactNode } from "react";

export type InstructionMode = "draw" | "rating";

interface InstructionDialogProps {
  open: boolean;
  mode: InstructionMode;
  onClose: () => void;
}

interface InstructionSectionProps {
  title: string;
  children: ReactNode;
}

function InstructionSection({ title, children }: InstructionSectionProps) {
  return (
    <Box component="section" className="instruction-section">
      <Typography variant="h6" component="h3" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

interface InstructionStepsProps {
  steps: ReactNode[];
}

function InstructionSteps({ steps }: InstructionStepsProps) {
  return (
    <List component="ol" disablePadding className="instruction-steps">
      {steps.map((step, index) => (
        <ListItem component="li" disableGutters alignItems="flex-start" key={index}>
          <Box component="span" className="instruction-step-number" aria-hidden="true">
            {index + 1}
          </Box>
          <ListItemText primary={step} />
        </ListItem>
      ))}
    </List>
  );
}

function DrawInstruction() {
  return (
    <>
      <Typography color="text.secondary">
        Раздел создаёт круговую жеребьёвку, формирует пары по турам и ведёт таблицу результатов.
      </Typography>

      <InstructionSection title="Порядок работы">
        <InstructionSteps
          steps={[
            <span>
              Заполните <strong>«Название турнира»</strong>, <strong>«Дату турнира»</strong> и при
              необходимости поле <strong>«Главный судья»</strong>.
            </span>,
            <span>
              Введите не менее двух участников в поле <strong>«Участники»</strong>. Имена можно
              разделять переносом строки или запятой. Повторяющиеся имена и имена длиннее 50
              символов нужно исправить.
            </span>,
            <span>
              Выберите режим распределения: кнопка <strong>«Случайное перемешивание включено»</strong> перемешает
              список перед жеребьёвкой; в выключенном режиме сохранится порядок ввода.
            </span>,
            <span>
              Нажмите <strong>«Составить жеребьёвку»</strong>. Ниже появятся таблица результатов и
              пары по турам. При нечётном числе участников в каждом туре один игрок будет отмечен
              как «свободен».
            </span>,
            <span>
              Чтобы внести результат, нажмите ячейку на пересечении двух участников и выберите
              <strong> 1</strong>, <strong>0</strong>, <strong>0,5</strong> или
              <strong> «Не сыграно»</strong>. Очки и дополнительный показатель расчитаются
              автоматически после заполенения всех результатов.
            </span>,
            <span>
              Проверьте итоговые места. Значение в столбце <strong>«Место»</strong> можно изменить
              вручную, в том числе указать диапазон, например «1–2». Предупреждение под таблицей
              сообщит о полностью одинаковых значениях.
            </span>,
            <span>
              Сохраните или распечатайте готовые материалы. Изменения турнира автоматически
              сохраняются в этом браузере.
            </span>
          ]}
        />
      </InstructionSection>

      <InstructionSection title="Кнопки и действия">
        <List className="instruction-actions" disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary="Составить жеребьёвку"
              secondary="Создаёт новую круговую жеребьёвку по текущему списку участников."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Сбросить"
              secondary="Удаляет текущий турнир из браузера и очищает заполненные поля."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Сохранить / Загрузить"
              secondary="Сохраняет турнир в JSON-файл или восстанавливает его из ранее сохранённого JSON."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Случайное перемешивание"
              secondary="Включает или выключает перемешивание участников перед созданием пар."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Открыть пары на туры"
              secondary="Открывает пары в отдельной вкладке; кнопка доступна после создания турнира."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Печатать таблицу / Печать пар туров"
              secondary="Открывает печать таблицы результатов или списка пар по турам."
            />
          </ListItem>
        </List>
      </InstructionSection>

      <InstructionSection title="Полезно знать">
        <Typography>
          Чёрные ячейки соответствуют участнику в его собственной строке и не редактируются. Для
          свободного от игры участника результат не вводится и очки не начисляются. После загрузки
          JSON можно продолжить работу с сохранёнными результатами.
        </Typography>
      </InstructionSection>
    </>
  );
}

function RatingInstruction() {
  return (
    <>
      <Typography color="text.secondary">
        Раздел последовательно пересчитывает российский шахматный рейтинг по одной базе CSV и
        одному или нескольким турнирным файлам SWM.
      </Typography>

      <InstructionSection title="Порядок работы">
        <InstructionSteps
          steps={[
            <span>
              Нажмите <strong>«Загрузить базу CSV»</strong> и выберите актуальную базу игроков. Имя
              принятого файла появится в зелёном сообщении.
            </span>,
            <span>
              Нажмите <strong>«Добавить турниры SWM»</strong> и выберите один или несколько файлов
              турниров. Новые файлы добавятся в конец очереди.
            </span>,
            <span>
              Проверьте порядок турниров. Расчёт выполняется сверху вниз: рейтинг, полученный после
              одного турнира, используется как начальный для следующего. Меняйте порядок стрелками
              вверх и вниз, ненужный файл удаляйте значком корзины.
            </span>,
            <span>
              Нажмите <strong>«Рассчитать»</strong>. Кнопка станет доступна, когда загружены база и
              хотя бы один турнир.
            </span>,
            <span>
              Проверьте блок <strong>«Итог расчёта»</strong>, предупреждения и карточки турниров.
              Нажмите строку турнира, чтобы раскрыть таблицу с начальным рейтингом, результатами по
              турам, очками, средним рейтингом соперников и новым рейтингом.
            </span>,
            <span>
              Нажмите <strong>«Скачать новую базу»</strong>. Обновлённый CSV сохранится в кодировке
              Windows-1251 под именем с текущей датой.
            </span>
          ]}
        />
      </InstructionSection>

      <InstructionSection title="Кнопки и действия">
        <List className="instruction-actions" disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary="Загрузить базу CSV"
              secondary="Выбирает исходную базу игроков для расчёта. Значок корзины рядом удаляет только загруженную базу."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Добавить турниры SWM"
              secondary="Добавляет один или несколько файлов .swm/.smw в очередь, не удаляя уже добавленные."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Стрелки и корзина в очереди"
              secondary="Меняют порядок расчёта или удаляют отдельный турнир. После изменения очереди расчёт нужно выполнить заново."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Рассчитать"
              secondary="Обрабатывает турниры по очереди и формирует обновлённую базу."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Скачать новую базу"
              secondary="Сохраняет результат расчёта в новый CSV-файл; исходный файл на компьютере не изменяется."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Сбросить"
              secondary="Очищает загруженную базу, всю очередь турниров и текущий результат расчёта."
            />
          </ListItem>
        </List>
      </InstructionSection>

      <InstructionSection title="Полезно знать">
        <Typography>
          Если сервис показывает ошибку или предупреждения, проверьте формат базы, данные игроков и
          результаты партий в SWM. До скачивания новой базы исходный CSV остаётся без изменений.
        </Typography>
      </InstructionSection>
    </>
  );
}

export default function InstructionDialog({ open, mode, onClose }: InstructionDialogProps) {
  const title = mode === "draw" ? "Инструкция: жеребьёвка" : "Инструкция: обсчёт рейтинга";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="paper"
      maxWidth={false}
      aria-labelledby="instruction-dialog-title"
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(18, 25, 38, 0.58)",
          backdropFilter: "blur(4px)"
        }
      }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start"
        },
        "& .MuiDialog-paper": {
          width: { xs: "calc(100vw - 32px)", sm: "50vw" },
          maxWidth: { xs: "calc(100vw - 32px)", sm: "50vw" },
          height: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
          maxHeight: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
          margin: { xs: 2, sm: 4 }
        }
      }}
    >
      <DialogTitle id="instruction-dialog-title" className="instruction-dialog-title">
        <Typography variant="h5" component="h2" fontWeight={600}>
          {title}
        </Typography>
        <IconButton aria-label="Закрыть инструкцию" onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className="instruction-dialog-content">
        {mode === "draw" ? <DrawInstruction /> : <RatingInstruction />}
      </DialogContent>
    </Dialog>
  );
}
