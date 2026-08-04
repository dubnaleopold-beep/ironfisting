import { Macrocycle } from '../data/macrocycle';

const MACROCYCLE_KEY = 'iron-pump-macrocycle';
const REFERENCE_PDM_KEY = 'iron-pump-reference-pdm';
const COMPLETED_WEEKS_KEY = 'iron-pump-completed-weeks';

// --- Активный макроцикл ---
export const saveActiveMacrocycle = (macrocycle: Macrocycle, currentWeek: number): void => {
  localStorage.setItem(MACROCYCLE_KEY, JSON.stringify({ macrocycleId: macrocycle.id, currentWeek }));
};

export const loadActiveMacrocycle = (): { macrocycleId: string; currentWeek: number } | null => {
  const raw = localStorage.getItem(MACROCYCLE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const getReferencePDM = (exerciseId: string): number | null => {
  const data = loadAllReferencePDM();
  return data[exerciseId] ?? null;
};

// --- Завершённые недели ---
export const completeWeek = (macrocycleId: string, week: number): void => {
  const completed = loadCompletedWeeks(macrocycleId);
  if (!completed.includes(week)) {
    completed.push(week);
    localStorage.setItem(`${COMPLETED_WEEKS_KEY}-${macrocycleId}`, JSON.stringify(completed));
  }
};

export const loadCompletedWeeks = (macrocycleId: string): number[] => {
  const raw = localStorage.getItem(`${COMPLETED_WEEKS_KEY}-${macrocycleId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const isWeekCompleted = (macrocycleId: string, week: number): boolean => {
  return loadCompletedWeeks(macrocycleId).includes(week);
};
// Удалить неделю из завершённых (отменить выполнение)
export const uncompleteWeek = (macrocycleId: string, week: number): void => {
  const completed = loadCompletedWeeks(macrocycleId);
  const filtered = completed.filter(w => w !== week);
  localStorage.setItem(`${COMPLETED_WEEKS_KEY}-${macrocycleId}`, JSON.stringify(filtered));
};

export const clearCompletedWeeks = (macrocycleId: string): void => {
  localStorage.removeItem(`${COMPLETED_WEEKS_KEY}-${macrocycleId}`);
};