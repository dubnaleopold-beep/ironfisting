// Тип для лога одного упражнения
export interface ExerciseLogEntry {
  exerciseId: string;
  category: string;
  pdm: number;
  tonnage: number;
  kpsh: number;
  topSet: {
    weight: number;
    reps: number;
    rpe: number;
  };
  backoffSets: {
    weight: number;
    reps: number;
  }[];
  lastBackoffRPE?: number | null;
}

// Тип для целой тренировки
export interface WorkoutLog {
  date: string;
  dayName: string;
  exercises: ExerciseLogEntry[];
  macrocycleId?: string;
  week?: number;
  mode?: string;
}

const STORAGE_KEY = 'iron-pump-logs';

// Загрузить все логи
export const loadLogs = (): WorkoutLog[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

// Сохранить новую тренировку
export const saveLog = (log: WorkoutLog): void => {
  const logs = loadLogs();
  logs.push(log);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

// Обновить существующую тренировку по индексу
export const updateLogByIndex = (index: number, updatedLog: WorkoutLog): void => {
  const logs = loadLogs();
  if (index >= 0 && index < logs.length) {
    logs[index] = updatedLog;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
};

// Найти последний ПДМ для упражнения по id
export const getLastPDM = (exerciseId: string): number | null => {
  const logs = loadLogs();
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i].exercises.find((e) => e.exerciseId === exerciseId);
    if (entry) return entry.pdm;
  }
  return null;
};

// --- Черновик активной тренировки ---
const DRAFT_KEY = 'iron-pump-draft';

export interface DraftData {
  dayIndex: number;
  entries: Record<string, {
    slotCategory: string;
    exerciseId: string;
    topSetWeight: number | string;
    topSetReps: number | string;
    topSetRPE: number | string;
    pdm: number | null;
    backoffSets: { weight: number; reps: number }[];
    lastBackoffRPE: number | string;
    warmupSets: { weight: number; reps: number; isBodyweight?: boolean }[];
    warmupChecked: boolean[];
    bodyweight?: number | string;
  }>;
}

export const saveDraft = (draft: DraftData): void => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const loadDraft = (): DraftData | null => {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const removeDraft = (): void => {
  localStorage.removeItem(DRAFT_KEY);
};

// Удалить тренировку по индексу
export const deleteLogByIndex = (index: number): void => {
  const logs = loadLogs();
  if (index >= 0 && index < logs.length) {
    logs.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
};

// Очистить всю историю
export const clearAllLogs = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// --- Импорт из CSV (поддержка старого и нового формата) ---
// --- Импорт из CSV (поддержка старого и нового формата) ---
export const importLogsFromCSV = (csvText: string): { count: number; error?: string; totalExercises?: number } => {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return { count: 0, error: 'Файл пуст' };

  const header = lines[0];
  const columns = header.split(';').map(c => c.trim());

  // Определяем формат
  const hasExerciseID = columns.includes('Exercise ID');
  const hasExerciseName = columns.includes('Упражнение'); // старый формат

  if (!hasExerciseID && !hasExerciseName) {
    return { count: 0, error: 'Не найден столбец "Exercise ID" или "Упражнение". Проверьте файл.' };
  }

  const dataLines = lines.slice(1);
  const logsMap = new Map<string, WorkoutLog>();

  for (const line of dataLines) {
    // Разбиваем с учётом возможных кавычек (но наш экспорт без кавычек, однако на всякий случай чистим)
    const cols = line.split(';').map(c => c.trim().replace(/^"(.*)"$/, '$1')); // убираем обрамляющие кавычки
    if (cols.length < 6) continue; // минимальное количество полей

    let dateStr: string, dayName: string, cycleStr: string;
    let exerciseId: string, exerciseCategory: string;
    let pdm: number, tonnage: number, kpsh: number;
    let topWeight: number, topReps: number, topRPE: number;
    let backoffSets: { weight: number; reps: number }[] = [];
    let lastBackoffRPE: number | null = null;

    if (hasExerciseID) {
      // Новый формат
      dateStr = cols[0]; dayName = cols[1]; cycleStr = cols[2];
      exerciseId = cols[3]; exerciseCategory = cols[4];
      pdm = parseFloat(cols[5]) || 0;
      tonnage = parseFloat(cols[6]) || 0;
      kpsh = parseFloat(cols[7]) || 0;
      topWeight = parseFloat(cols[8]) || 0;
      topReps = parseInt(cols[9]) || 0;
      topRPE = parseFloat(cols[10]) || 0;

      let idx = 11;
      for (let i = 0; i < 5; i++) {
        const w = parseFloat(cols[idx] || '0');
        const r = parseInt(cols[idx + 1] || '0');
        if (!isNaN(w) && !isNaN(r) && (w > 0 || r > 0)) {
          backoffSets.push({ weight: w, reps: r });
        }
        idx += 2;
      }
      if (cols[idx]) lastBackoffRPE = parseFloat(cols[idx]) || null;

    } else {
      // Старый формат (без Exercise ID, бэкоф-сеты в одной колонке)
      // Индексы: 0-дата,1-день,2-цикл,3-упражнение(категория),4-ПДМ,5-Тоннаж,6-КПШ,7-топ вес,8-топ повт,9-топ RPE,10-бэкоф-сеты,11-RPE последнего
      dateStr = cols[0]; dayName = cols[1]; cycleStr = cols[2];
      exerciseId = cols[3]; // используем как ID
      exerciseCategory = cols[3];
      pdm = parseFloat(cols[4]) || 0;
      tonnage = parseFloat(cols[5]) || 0;
      kpsh = parseFloat(cols[6]) || 0;
      topWeight = parseFloat(cols[7]) || 0;
      topReps = parseInt(cols[8]) || 0;
      topRPE = parseFloat(cols[9]) || 0;

      // бэкоф-сеты: может быть что-то вроде "105x5; 105x5" или "105x5 ; 105x5"
      const backoffRaw = cols[10] || '';
      if (backoffRaw && backoffRaw !== '—') {
        // Убираем возможные кавычки и лишние пробелы
        const clean = backoffRaw.replace(/"/g, '').trim();
        // Разбиваем по ; или , (на случай разных разделителей)
        const parts = clean.split(/[;,]/);
        for (const part of parts) {
          const match = part.trim().match(/(\d+(?:\.\d+)?)\s*x\s*(\d+)/i);
          if (match) {
            const w = parseFloat(match[1]);
            const r = parseInt(match[2]);
            if (!isNaN(w) && !isNaN(r)) backoffSets.push({ weight: w, reps: r });
          }
        }
      }
      // RPE последнего: может быть в cols[11], если есть
      if (cols.length > 11 && cols[11] && cols[11] !== '—') {
        lastBackoffRPE = parseFloat(cols[11]) || null;
      }
    }

    // дата
    const parts = dateStr.split('.');
    if (parts.length !== 3) continue;
    const day = parseInt(parts[0]), month = parseInt(parts[1]) - 1, year = parseInt(parts[2]);
    const isoDate = new Date(year, month, day).toISOString();

    let macrocycleId: string | undefined;
    let week: number | undefined;
    if (cycleStr !== 'свободная') {
      const match = cycleStr.match(/^(.+?) нед\.(\d+)$/);
      if (match) {
        macrocycleId = match[1];
        week = parseInt(match[2]);
      }
    }

    const key = isoDate + '|' + dayName;
    if (!logsMap.has(key)) {
      logsMap.set(key, {
        date: isoDate,
        dayName,
        exercises: [],
        macrocycleId,
        week,
        mode: macrocycleId ? 'macrocycle' : 'free',
      });
    }
    const log = logsMap.get(key)!;
    log.exercises.push({
      exerciseId,
      category: exerciseCategory,
      pdm,
      tonnage,
      kpsh,
      topSet: { weight: topWeight, reps: topReps, rpe: topRPE },
      backoffSets,
      lastBackoffRPE,
    });
  }

  const currentLogs = loadLogs();
  let addedCount = 0;
  logsMap.forEach(newLog => {
    const exists = currentLogs.some(l =>
      l.date === newLog.date && l.dayName === newLog.dayName
    );
    if (!exists) {
      currentLogs.push(newLog);
      addedCount++;
    }
  });
  currentLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
  return { count: addedCount, totalExercises: logsMap.size };
};