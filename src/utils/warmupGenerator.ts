// Типы упражнений для правил разминки
export type WarmupType = 'barbell' | 'machine';

interface WarmupStep {
  percent: number;   // процент от ожидаемого веса топ-сета
  reps: number;
}

// Шаблоны разминки
const barbellWarmup: WarmupStep[] = [
  { percent: 0.20, reps: 12 },  // пустой гриф
  { percent: 0.50, reps: 6 },
  { percent: 0.60, reps: 5 },
  { percent: 0.70, reps: 3 },
  { percent: 0.80, reps: 2 },
  { percent: 0.90, reps: 1 },   // последний разминочный (без ЦНС-перегруза)
];

const machineWarmup: WarmupStep[] = [
  { percent: 0.40, reps: 12 },
  { percent: 0.60, reps: 8 },
  { percent: 0.75, reps: 4 },
];

interface GenerateWarmupParams {
  previousPDM: number;            // ПДМ с прошлой тренировки
  targetTopSetPercent: number;    // целевой % от ПДМ для топ-сета (из микроцикла)
  warmupType: WarmupType;
  bodyweight?: number;            // для подтягиваний (свой вес)
}

export interface WarmupSet {
  weight: number;
  reps: number;
  isBodyweight?: boolean; // true, если вес равен собственному весу (для отображения)
}

/**
 * Генерирует массив разминочных подходов на основе предыдущего ПДМ и целевого веса топ-сета.
 * Веса округляются до 2.5 кг для штанги, до 5 кг для тренажёров.
 */
export const generateWarmupSets = (params: GenerateWarmupParams): WarmupSet[] => {
  const { previousPDM, targetTopSetPercent, warmupType, bodyweight } = params;

  // Ожидаемый вес топ-сета
  const topSetWeight = previousPDM * targetTopSetPercent;

  // Выбираем шаблон
  const steps = warmupType === 'machine' ? machineWarmup : barbellWarmup;

  // Шаг округления: 2.5 для штанги, 5 для тренажёров
  const roundTo = warmupType === 'machine' ? 5 : 2.5;

  const sets: WarmupSet[] = steps.map(step => {
    let weight = topSetWeight * step.percent;

    // Для подтягиваний первый подход — свой вес
    if (bodyweight && step.percent === 0.20) {
      return { weight: bodyweight, reps: step.reps, isBodyweight: true };
    }

    // Округление вниз до ближайшего roundTo (но не меньше 20 для пустого грифа)
    weight = Math.floor(weight / roundTo) * roundTo;
    if (step.percent === 0.20 && weight < 20) weight = 20; // минимум пустой гриф

    return { weight, reps: step.reps };
  });

  return sets;
};