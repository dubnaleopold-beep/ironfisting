import { Macrocycle } from '../data/macrocycle';

const MACROCYCLE_KEY = 'iron-pump-macrocycle';
const REFERENCE_PDM_KEY = 'iron-pump-reference-pdm';
const COMPLETED_DAYS_KEY = 'iron-pump-completed-days';

// --- Активный макроцикл ---
export const saveActiveMacrocycle = (macrocycle: Macrocycle, currentWeek: number): void => {
  localStorage.setItem(MACROCYCLE_KEY, JSON.stringify({ macrocycleId: macrocycle.id, currentWeek }));
};

export const loadActiveMacrocycle = (): { macrocycleId: string; currentWeek: number } | null => {
  const raw = localStorage.getItem(MACROCYCLE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

// --- Эталонные ПДМ ---
export const saveReferencePDM = (exerciseId: string, pdm: number): void => {
  const data = loadAllReferencePDM();
  data[exerciseId] = pdm;
  localStorage.setItem(REFERENCE_PDM_KEY, JSON.stringify(data));
};

export const loadAllReferencePDM = (): Record<string, number> => {
  const raw = localStorage.getItem(REFERENCE_PDM_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

export const getReferencePDM = (exerciseId: string): number | null => {
  const data = loadAllReferencePDM();
  return data[exerciseId] ?? null;
};

// --- Выполненные ДНИ (не только недели) ---
interface CompletedDays {
  [week: string]: number[];   // week -> массив dayIndex (0, 1, ...)
}

const loadCompletedDays = (macrocycleId: string): CompletedDays => {
  const raw = localStorage.getItem(`${COMPLETED_DAYS_KEY}-${macrocycleId}`);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const saveCompletedDays = (macrocycleId: string, days: CompletedDays): void => {
  localStorage.setItem(`${COMPLETED_DAYS_KEY}-${macrocycleId}`, JSON.stringify(days));
};

/** Проверить, выполнен ли конкретный день на неделе */
export const isDayCompleted = (macrocycleId: string, week: number, dayIndex: number): boolean => {
  const days = loadCompletedDays(macrocycleId);
  return days[week]?.includes(dayIndex) ?? false;
};

/** Проверить, выполнена ли неделя целиком (оба дня) */
export const isWeekCompleted = (macrocycleId: string, week: number): boolean => {
  const days = loadCompletedDays(macrocycleId);
  const completedDays = days[week] || [];
  // Проверяем, что выполнены оба дня: dayIndex 0 и 1
  return completedDays.includes(0) && completedDays.includes(1);
};

/** Отметить день выполненным */
export const completeDay = (macrocycleId: string, week: number, dayIndex: number): void => {
  const days = loadCompletedDays(macrocycleId);
  if (!days[week]) days[week] = [];
  if (!days[week].includes(dayIndex)) {
    days[week].push(dayIndex);
    saveCompletedDays(macrocycleId, days);
  }
};

/** Отменить выполнение дня */
export const uncompleteDay = (macrocycleId: string, week: number, dayIndex: number): void => {
  const days = loadCompletedDays(macrocycleId);
  if (days[week]) {
    days[week] = days[week].filter(d => d !== dayIndex);
    if (days[week].length === 0) delete days[week];
    saveCompletedDays(macrocycleId, days);
  }
};

/** Сбросить все выполненные дни для макроцикла */
export const clearCompletedDays = (macrocycleId: string): void => {
  localStorage.removeItem(`${COMPLETED_DAYS_KEY}-${macrocycleId}`);
};