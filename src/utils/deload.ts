const DELOAD_THRESHOLD = 0.10; // 10%

export interface DeloadDecision {
  shouldDeload: boolean;
  percentDrop: number;
  recommendedBackoffWeight: number;
  recommendedBackoffSets: number;
}

// Старая проверка (только с предыдущим ПДМ)
export const checkDeload = (
  currentPDM: number,
  previousPDM: number | null,
  baseBackoffWeight: number,
  baseBackoffSets: number
): DeloadDecision => {
  if (previousPDM === null || previousPDM === 0) {
    return { shouldDeload: false, percentDrop: 0, recommendedBackoffWeight: baseBackoffWeight, recommendedBackoffSets: baseBackoffSets };
  }
  const drop = (previousPDM - currentPDM) / previousPDM;
  if (drop >= DELOAD_THRESHOLD) {
    return {
      shouldDeload: true,
      percentDrop: drop * 100,
      recommendedBackoffWeight: Math.round((baseBackoffWeight * 0.5) / 2.5) * 2.5,
      recommendedBackoffSets: Math.max(1, Math.floor(baseBackoffSets / 2)),
    };
  }
  return { shouldDeload: false, percentDrop: drop * 100, recommendedBackoffWeight: baseBackoffWeight, recommendedBackoffSets: baseBackoffSets };
};

// Новая проверка с эталонным ПДМ (двойной контроль)
export const checkDeloadWithReference = (
  currentPDM: number,
  previousPDM: number | null,
  referencePDM: number | null,
  baseBackoffWeight: number,
  baseBackoffSets: number
): DeloadDecision => {
  // Сначала проверяем обычную разгрузку от предыдущего
  const standardDecision = checkDeload(currentPDM, previousPDM, baseBackoffWeight, baseBackoffSets);
  
  // Если уже сработала, возвращаем её
  if (standardDecision.shouldDeload) return standardDecision;

  // Иначе проверяем падение от эталона
  if (referencePDM !== null && referencePDM > 0) {
    const dropFromReference = (referencePDM - currentPDM) / referencePDM;
    if (dropFromReference >= DELOAD_THRESHOLD) {
      return {
        shouldDeload: true,
        percentDrop: dropFromReference * 100,
        recommendedBackoffWeight: Math.round((baseBackoffWeight * 0.5) / 2.5) * 2.5,
        recommendedBackoffSets: Math.max(1, Math.floor(baseBackoffSets / 2)),
      };
    }
  }

  return standardDecision; // нет разгрузки
};