// Определяем структуру слота
export interface ExerciseSlot {
  category: string; // например, "Грудные"
  defaultExerciseId: string; // id упражнения по умолчанию
  alternatives: string[]; // id доступных замен из библиотеки
}

// Определяем структуру тренировочного дня
export interface WorkoutDay {
  name: string; // "Тренировка 1"
  slots: ExerciseSlot[];
}

// Два дня с новыми категориями и расширенным списком замен
const workoutPlan: WorkoutDay[] = [
  {
    name: 'Тренировка 1 (Грудь, ноги, спина, плечи)',
    slots: [
      {
        category: 'Грудные',
        defaultExerciseId: 'barbell_bench',
        alternatives: ['barbell_bench', 'dumbbell_bench', 'dips'],
      },
      {
        category: 'Ноги (становая)',
        defaultExerciseId: 'deadlift',
        alternatives: ['deadlift', 'romanian_deadlift'],
      },
      {
        category: 'Спина горизонтальная',
        defaultExerciseId: 'barbell_row',
        alternatives: ['barbell_row', 'dumbbell_row', 'tbar_row', 'cable_row', 'hammer_row'],
      },
      {
        category: 'Плечи',
        defaultExerciseId: 'db_lateral',
        alternatives: ['db_lateral'],
      },
    ],
  },
  {
    name: 'Тренировка 2 (Ноги, спина, плечи)',
    slots: [
      {
        category: 'Ноги',
        defaultExerciseId: 'barbell_squat',
        alternatives: ['barbell_squat', 'hack_squat', 'leg_press'],
      },
      {
        category: 'Спина вертикальная',
        defaultExerciseId: 'pullups',
        alternatives: ['pullups', 'lat_pulldown', 'hammer_pulldown'],
      },
      {
        category: 'Плечи',
        defaultExerciseId: 'ohp_barbell',
        alternatives: ['ohp_barbell', 'ohp_dumbbell'],
      },
      {
        category: 'Ноги',
        defaultExerciseId: 'leg_extension',
        alternatives: ['leg_extension'],
      },
    ],
  },
];

export default workoutPlan;