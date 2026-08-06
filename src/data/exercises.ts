export type Protocol = 'cns_activation' | 'standard' | 'free';
export type WarmupType = 'barbell' | 'machine';

export interface Exercise {
  id: string;
  name: string;
  protocol: Protocol;
  category: string;
  alternatives?: string[];
  warmupType: WarmupType;
  needsBodyweight?: boolean;
}

const exercises: Exercise[] = [
  // ================== ГРУДНЫЕ ==================
  {
    id: 'barbell_bench',
    name: 'Жим штанги лёжа',
    protocol: 'cns_activation',
    category: 'Грудные',
    alternatives: ['dumbbell_bench', 'dips', 'incline_barbell_bench', 'incline_dumbbell_bench'],
    warmupType: 'barbell',
  },
  {
    id: 'dumbbell_bench',
    name: 'Жим гантелей лёжа',
    protocol: 'cns_activation',
    category: 'Грудные',
    alternatives: ['barbell_bench', 'dips', 'incline_barbell_bench', 'incline_dumbbell_bench'],
    warmupType: 'barbell',
  },
  {
    id: 'dips',
    name: 'Отжимания на брусьях',
    protocol: 'standard',
    category: 'Грудные',
    alternatives: ['barbell_bench', 'dumbbell_bench'],
    warmupType: 'machine',
  },
  // НОВЫЕ: наклонная скамья
  {
    id: 'incline_barbell_bench',
    name: 'Жим штанги на наклонной скамье',
    protocol: 'cns_activation',
    category: 'Грудные',
    alternatives: ['barbell_bench', 'dumbbell_bench', 'incline_dumbbell_bench'],
    warmupType: 'barbell',
  },
  {
    id: 'incline_dumbbell_bench',
    name: 'Жим гантелей на наклонной скамье',
    protocol: 'cns_activation',
    category: 'Грудные',
    alternatives: ['barbell_bench', 'dumbbell_bench', 'incline_barbell_bench'],
    warmupType: 'barbell',
  },

  // ================== НОГИ ==================
  {
    id: 'barbell_squat',
    name: 'Приседания со штангой',
    protocol: 'cns_activation',
    category: 'Ноги',
    alternatives: ['hack_squat', 'leg_press'],
    warmupType: 'barbell',
  },
  {
    id: 'hack_squat',
    name: 'Гакк-приседания',
    protocol: 'standard',
    category: 'Ноги',
    alternatives: ['barbell_squat', 'leg_press'],
    warmupType: 'machine',
  },
  {
    id: 'leg_press',
    name: 'Жим ногами',
    protocol: 'standard',
    category: 'Ноги',
    alternatives: ['barbell_squat', 'hack_squat'],
    warmupType: 'machine',
  },
  {
    id: 'deadlift',
    name: 'Становая тяга',
    protocol: 'cns_activation',
    category: 'Ноги (становая)',
    alternatives: ['romanian_deadlift'],
    warmupType: 'barbell',
  },
  {
    id: 'romanian_deadlift',
    name: 'Румынская тяга',
    protocol: 'cns_activation',
    category: 'Ноги (становая)',
    alternatives: ['deadlift'],
    warmupType: 'barbell',
  },
  {
    id: 'leg_extension',
    name: 'Разгибания ног в тренажёре',
    protocol: 'free',
    category: 'Ноги',
    alternatives: [],
    warmupType: 'machine',
  },

  // ================== СПИНА ==================
  {
    id: 'pullups',
    name: 'Подтягивания',
    protocol: 'cns_activation',
    category: 'Спина вертикальная',
    alternatives: ['lat_pulldown', 'hammer_pulldown'],
    warmupType: 'barbell',
    needsBodyweight: true,
  },
  {
    id: 'lat_pulldown',
    name: 'Тяга вертикального блока',
    protocol: 'standard',
    category: 'Спина вертикальная',
    alternatives: ['pullups', 'hammer_pulldown'],
    warmupType: 'machine',
  },
  {
    id: 'hammer_pulldown',
    name: 'Вертикальная тяга в Хаммере',
    protocol: 'standard',
    category: 'Спина вертикальная',
    alternatives: ['pullups', 'lat_pulldown'],
    warmupType: 'machine',
  },
  {
    id: 'barbell_row',
    name: 'Тяга штанги в наклоне',
    protocol: 'standard',
    category: 'Спина горизонтальная',
    alternatives: ['dumbbell_row', 'tbar_row', 'cable_row', 'hammer_row'],
    warmupType: 'barbell',
  },
  {
    id: 'dumbbell_row',
    name: 'Тяга гантелей в наклоне',
    protocol: 'standard',
    category: 'Спина горизонтальная',
    alternatives: ['barbell_row', 'tbar_row', 'cable_row', 'hammer_row'],
    warmupType: 'barbell',
  },
  {
    id: 'tbar_row',
    name: 'Тяга Т-грифа',
    protocol: 'standard',
    category: 'Спина горизонтальная',
    alternatives: ['barbell_row', 'dumbbell_row', 'cable_row', 'hammer_row'],
    warmupType: 'machine',
  },
  {
    id: 'cable_row',
    name: 'Тяга горизонтального блока',
    protocol: 'standard',
    category: 'Спина горизонтальная',
    alternatives: ['barbell_row', 'dumbbell_row', 'tbar_row', 'hammer_row'],
    warmupType: 'machine',
  },
  {
    id: 'hammer_row',
    name: 'Горизонтальная тяга в Хаммере',
    protocol: 'standard',
    category: 'Спина горизонтальная',
    alternatives: ['barbell_row', 'dumbbell_row', 'tbar_row', 'cable_row'],
    warmupType: 'machine',
  },

  // ================== ПЛЕЧИ ==================
  {
    id: 'ohp_barbell',
    name: 'Жим штанги стоя',
    protocol: 'standard',
    category: 'Плечи',
    alternatives: ['ohp_dumbbell'],
    warmupType: 'barbell',
  },
  {
    id: 'ohp_dumbbell',
    name: 'Жим гантелей стоя',
    protocol: 'standard',
    category: 'Плечи',
    alternatives: ['ohp_barbell'],
    warmupType: 'barbell',
  },
  {
    id: 'db_lateral',
    name: 'Махи гантелей в стороны',
    protocol: 'free',
    category: 'Плечи',
    alternatives: [],
    warmupType: 'machine',
  },
];

export default exercises;