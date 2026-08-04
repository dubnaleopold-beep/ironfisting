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

// Обновить существующую тренировку по индексу (0 - самая старая)
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