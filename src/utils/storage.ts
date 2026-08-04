export interface ExerciseLogEntry {
  exerciseId: string;
  category: string;
  pdm: number;
  tonnage: number;
  kpsh: number;
  topSet: { weight: number; reps: number; rpe: number };
  backoffSets: { weight: number; reps: number }[];
  lastBackoffRPE?: number | null;
}

export interface WorkoutLog {
  date: string;
  dayName: string;
  exercises: ExerciseLogEntry[];
  macrocycleId?: string;
  week?: number;
  mode?: string;
}

const STORAGE_KEY = 'iron-pump-logs';

export const loadLogs = (): WorkoutLog[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

// Сохранение/обновление тренировки: если существует запись с той же датой, днём и (для макроцикла) macrocycleId/week, то обновляем её
export const saveLog = (log: WorkoutLog): void => {
  const logs = loadLogs();
  const existingIndex = logs.findIndex(l => {
    const sameDate = l.date === log.date;
    const sameDay = l.dayName === log.dayName;
    if (log.macrocycleId && log.week) {
      return sameDate && sameDay && l.macrocycleId === log.macrocycleId && l.week === log.week;
    }
    // для свободных тренировок сравниваем только дату и день
    return sameDate && sameDay && !l.macrocycleId && !log.macrocycleId;
  });

  if (existingIndex !== -1) {
    // Объединяем упражнения: новые перезаписывают старые по category, остальные сохраняются
    const existing = logs[existingIndex];
    const mergedExercises = [...existing.exercises];
    for (const newEx of log.exercises) {
      const idx = mergedExercises.findIndex(e => e.category === newEx.category);
      if (idx !== -1) {
        mergedExercises[idx] = newEx;
      } else {
        mergedExercises.push(newEx);
      }
    }
    existing.exercises = mergedExercises;
    existing.mode = log.mode || existing.mode;
    existing.macrocycleId = log.macrocycleId || existing.macrocycleId;
    existing.week = log.week ?? existing.week;
    logs[existingIndex] = existing;
  } else {
    logs.push(log);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

export const updateLogByIndex = (index: number, updatedLog: WorkoutLog): void => {
  const logs = loadLogs();
  if (index >= 0 && index < logs.length) {
    logs[index] = updatedLog;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
};

export const getLastPDM = (exerciseId: string): number | null => {
  const logs = loadLogs();
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i].exercises.find(e => e.exerciseId === exerciseId);
    if (entry) return entry.pdm;
  }
  return null;
};

// Черновик: ключ теперь включает macrocycleId и week
const draftKey = (dayIndex: number, macrocycleId?: string, week?: number) =>
  `draft-${dayIndex}-${macrocycleId || 'free'}-${week || 'any'}`;

export interface DraftData {
  dayIndex: number;
  macrocycleId?: string;
  currentWeek?: number;
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
    backoffChecked: boolean[];   // новое: галочки выполнения бэкоф-сетов
    bodyweight?: number | string;
  }>;
}

export const saveDraft = (draft: DraftData): void => {
  const key = draftKey(draft.dayIndex, draft.macrocycleId, draft.currentWeek);
  localStorage.setItem(key, JSON.stringify(draft));
};

export const loadDraft = (dayIndex: number, macrocycleId?: string, week?: number): DraftData | null => {
  const key = draftKey(dayIndex, macrocycleId, week);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const removeDraft = (dayIndex: number, macrocycleId?: string, week?: number): void => {
  const key = draftKey(dayIndex, macrocycleId, week);
  localStorage.removeItem(key);
};

export const deleteLogByIndex = (index: number): void => {
  const logs = loadLogs();
  if (index >= 0 && index < logs.length) {
    logs.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
};

export const clearAllLogs = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// --- Импорт из CSV (универсальный) ---
export const importLogsFromCSV = (csvText: string): { count: number; error?: string; totalExercises?: number } => {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return { count: 0, error: 'Файл пуст' };
  const header = lines[0];
  const columns = header.split(';').map(c => c.trim());
  const isNewFormat = columns.includes('Exercise ID');

  const dataLines = lines.slice(1);
  const logsMap = new Map<string, WorkoutLog>();

  for (const line of dataLines) {
    const cols = line.split(';').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
    if (cols.length < 6) continue;

    let dateStr: string, dayName: string, cycleStr: string;
    let exerciseId: string, exerciseCategory: string;
    let pdm: number, tonnage: number, kpsh: number;
    let topWeight: number, topReps: number, topRPE: number;
    let backoffSets: { weight: number; reps: number }[] = [];
    let lastBackoffRPE: number | null = null;

    if (isNewFormat) {
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
        const r = parseInt(cols[idx+1] || '0');
        if (!isNaN(w) && !isNaN(r) && (w > 0 || r > 0)) backoffSets.push({ weight: w, reps: r });
        idx += 2;
      }
      if (cols.length > idx && cols[idx]) lastBackoffRPE = parseFloat(cols[idx]) || null;
    } else {
      dateStr = cols[0]; dayName = cols[1]; cycleStr = cols[2];
      exerciseId = cols[3]; exerciseCategory = cols[3];
      pdm = parseFloat(cols[4]) || 0;
      tonnage = parseFloat(cols[5]) || 0;
      kpsh = parseFloat(cols[6]) || 0;
      topWeight = parseFloat(cols[7]) || 0;
      topReps = parseInt(cols[8]) || 0;
      topRPE = parseFloat(cols[9]) || 0;
      const backoffRaw = cols[10] || '';
      if (backoffRaw && backoffRaw !== '—') {
        const clean = backoffRaw.replace(/"/g, '').trim();
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
      if (cols.length > 11 && cols[11] && cols[11] !== '—') lastBackoffRPE = parseFloat(cols[11]) || null;
    }

    const parts = dateStr.split('.');
    if (parts.length !== 3) continue;
    const day = parseInt(parts[0]), month = parseInt(parts[1]) - 1, year = parseInt(parts[2]);
    const isoDate = new Date(year, month, day).toISOString();

    let macrocycleId: string | undefined;
    let week: number | undefined;
    if (cycleStr !== 'свободная') {
      const match = cycleStr.match(/^(.+?) нед\.(\d+)$/);
      if (match) { macrocycleId = match[1]; week = parseInt(match[2]); }
    }

    const key = isoDate + '|' + dayName + '|' + (macrocycleId || '');
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
    const exists = currentLogs.some(l => l.date === newLog.date && l.dayName === newLog.dayName);
    if (!exists) {
      currentLogs.push(newLog);
      addedCount++;
    }
  });
  currentLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
  return { count: addedCount, totalExercises: logsMap.size };
};