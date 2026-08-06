export interface ExerciseSlot {
  id: string;           // уникальный ключ слота
  category: string;
  defaultExerciseId: string;
  alternatives: string[];
}

export interface WorkoutDay {
  name: string;
  slots: ExerciseSlot[];
}

const workoutPlan: WorkoutDay[] = [
  {
    name: 'Тренировка 1 (Грудь, ноги, спина, плечи)',
    slots: [
      {
        id: 'chest',
        category: 'Грудные',
        defaultExerciseId: 'barbell_bench',
        alternatives: ['barbell_bench', 'dumbbell_bench', 'dips', 'incline_barbell_bench', 'incline_dumbbell_bench'],
      },
      {
        id: 'deadlift_slot',
        category: 'Ноги (становая)',
        defaultExerciseId: 'deadlift',
        alternatives: ['deadlift', 'romanian_deadlift'],
      },
      {
        id: 'row_slot',
        category: 'Спина горизонтальная',
        defaultExerciseId: 'barbell_row',
        alternatives: ['barbell_row', 'dumbbell_row', 'tbar_row', 'cable_row', 'hammer_row'],
      },
      {
        id: 'shoulder_free',
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
        id: 'squat_slot',
        category: 'Ноги',
        defaultExerciseId: 'barbell_squat',
        alternatives: ['barbell_squat', 'hack_squat', 'leg_press'],
      },
      {
        id: 'back_vertical',
        category: 'Спина вертикальная',
        defaultExerciseId: 'pullups',
        alternatives: ['pullups', 'lat_pulldown', 'hammer_pulldown'],
      },
      {
        id: 'ohp_slot',
        category: 'Плечи',
        defaultExerciseId: 'ohp_barbell',
        alternatives: ['ohp_barbell', 'ohp_dumbbell'],
      },
      {
        id: 'leg_ext_slot',
        category: 'Ноги',
        defaultExerciseId: 'leg_extension',
        alternatives: ['leg_extension'],
      },
    ],
  },
];

export default workoutPlan;