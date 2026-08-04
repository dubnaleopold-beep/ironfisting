export interface Microcycle {
  week: number;
  phase: string;
  backoffPercent: number;   // процент от ПДМ для бэкоф-сетов
  topSetReps: number;       // целевые повторения в топ-сете
  topSetTargetRPE: number;  // целевой RPE
  progression: string;      // 'volume_up', 'intensity_up', 'static'
  backoffSetsCount: number; // количество бэкоф-сетов
  isDeload?: boolean;
  deloadPercent?: number;   // на случай, если разгрузка (обычно 0.5)
}

export interface Macrocycle {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  microcycles: Microcycle[];
}

const macrocycles: Macrocycle[] = [
  // ================== МАССА ==================
  {
    id: 'mass_12weeks',
    name: 'МАССА (12 недель)',
    description:
      'Натуральная гипертрофия и сила на профиците. Управляемый стресс, объём от MEV к MRV, жёсткая разгрузка.',
    durationWeeks: 12,
    microcycles: [
      // ---- Фаза 1: Накопление (объём растёт, RPE низкий) ----
      { week: 1, phase: 'Накопление', backoffPercent: 0.725, topSetReps: 5, topSetTargetRPE: 7.5, progression: 'volume_up', backoffSetsCount: 3 },
      { week: 2, phase: 'Накопление', backoffPercent: 0.725, topSetReps: 5, topSetTargetRPE: 7.5, progression: 'volume_up', backoffSetsCount: 3 },
      { week: 3, phase: 'Накопление', backoffPercent: 0.75,  topSetReps: 5, topSetTargetRPE: 8.0, progression: 'volume_up', backoffSetsCount: 3 },
      { week: 4, phase: 'Накопление', backoffPercent: 0.75,  topSetReps: 4, topSetTargetRPE: 8.0, progression: 'volume_up', backoffSetsCount: 3 },
      // ---- Фаза 2: Интенсивность (объём снижается, интенсивность растёт) ----
      { week: 5, phase: 'Интенсивность', backoffPercent: 0.775, topSetReps: 4, topSetTargetRPE: 8.5, progression: 'intensity_up', backoffSetsCount: 2 },
      { week: 6, phase: 'Интенсивность', backoffPercent: 0.80,  topSetReps: 3, topSetTargetRPE: 8.5, progression: 'intensity_up', backoffSetsCount: 2 },
      { week: 7, phase: 'Интенсивность', backoffPercent: 0.80,  topSetReps: 3, topSetTargetRPE: 9.0, progression: 'intensity_up', backoffSetsCount: 2 },
      { week: 8, phase: 'Интенсивность', backoffPercent: 0.82,  topSetReps: 3, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 2 },
      // ---- Фаза 3: Специализация (высокая интенсивность, низкий объём) ----
      { week: 9,  phase: 'Специализация', backoffPercent: 0.85, topSetReps: 2, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 1 },
      { week: 10, phase: 'Специализация', backoffPercent: 0.85, topSetReps: 2, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 1 },
      { week: 11, phase: 'Специализация', backoffPercent: 0.87, topSetReps: 1, topSetTargetRPE: 9.5, progression: 'static', backoffSetsCount: 1 },
      // ---- Фаза 4: Разгрузка (полный сброс усталости) ----
      { week: 12, phase: 'Разгрузка', backoffPercent: 0.5, topSetReps: 3, topSetTargetRPE: 7.0, progression: 'static', backoffSetsCount: 1, isDeload: true, deloadPercent: 0.5 },
    ],
  },

  // ================== СУШКА ==================
  {
    id: 'cut_10weeks',
    name: 'СУШКА (10 недель)',
    description:
      'Сохранение силы на дефиците. Минимальный эффективный объём, высокая интенсивность, частые разгрузки для ЦНС.',
    durationWeeks: 10,
    microcycles: [
      // ---- Неделя 1: Активация (возвращение в рабочий режим) ----
      { week: 1, phase: 'Активация', backoffPercent: 0.75, topSetReps: 4, topSetTargetRPE: 8.0, progression: 'static', backoffSetsCount: 2 },
      // ---- Недели 2-4: Интенсивность (сохраняем силу, не насилуем ЦНС) ----
      { week: 2, phase: 'Интенсивность', backoffPercent: 0.80, topSetReps: 3, topSetTargetRPE: 8.5, progression: 'intensity_up', backoffSetsCount: 2 },
      { week: 3, phase: 'Интенсивность', backoffPercent: 0.80, topSetReps: 3, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 2 },
      { week: 4, phase: 'Интенсивность', backoffPercent: 0.82, topSetReps: 2, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 2 },
      // ---- Неделя 5: Разгрузка (обязательная!) ----
      { week: 5, phase: 'Разгрузка', backoffPercent: 0.5, topSetReps: 3, topSetTargetRPE: 7.0, progression: 'static', backoffSetsCount: 1, isDeload: true, deloadPercent: 0.5 },
      // ---- Недели 6-9: Поддержание (удерживаем силу до конца) ----
      { week: 6, phase: 'Поддержание', backoffPercent: 0.80, topSetReps: 3, topSetTargetRPE: 8.5, progression: 'static', backoffSetsCount: 2 },
      { week: 7, phase: 'Поддержание', backoffPercent: 0.82, topSetReps: 2, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 2 },
      { week: 8, phase: 'Поддержание', backoffPercent: 0.82, topSetReps: 2, topSetTargetRPE: 9.0, progression: 'static', backoffSetsCount: 2 },
      { week: 9, phase: 'Поддержание', backoffPercent: 0.85, topSetReps: 1, topSetTargetRPE: 9.5, progression: 'static', backoffSetsCount: 2 },
      // ---- Неделя 10: Финальная разгрузка ----
      { week: 10, phase: 'Разгрузка', backoffPercent: 0.5, topSetReps: 3, topSetTargetRPE: 7.0, progression: 'static', backoffSetsCount: 1, isDeload: true, deloadPercent: 0.5 },
    ],
  },
];

export default macrocycles;