// Локальное описание лога, чтобы не импортировать storage.ts
interface ExerciseLogEntry {
  exerciseId: string;
  category: string;
  pdm: number;
  tonnage: number;
  kpsh: number;
  lastBackoffRPE?: number | null;
  backoffSets: { weight: number; reps: number }[];
}

interface WorkoutLog {
  date: string;
  dayName: string;
  exercises: ExerciseLogEntry[];
  macrocycleId?: string;
  week?: number;
  mode?: string;
}

export function analyzeLogs(logs: WorkoutLog[]): string[] {
  const advice: string[] = [];

  // 1. Рост RPE последнего бэкоф-сета
  if (logs.length >= 2) {
    const last = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    for (const ex of last.exercises) {
      const prevEx = prev.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (prevEx && ex.lastBackoffRPE && prevEx.lastBackoffRPE) {
        const lastSet = ex.backoffSets[ex.backoffSets.length - 1];
        const prevLastSet = prevEx.backoffSets[prevEx.backoffSets.length - 1];
        if (lastSet && prevLastSet && lastSet.weight === prevLastSet.weight) {
          const diff = ex.lastBackoffRPE - prevEx.lastBackoffRPE;
          if (diff >= 1.5) {
            advice.push(`⚠️ В упражнении "${ex.category}" RPE последнего бэкоф-сета вырос на ${diff.toFixed(1)} при том же весе. Вероятно, накопилась усталость.`);
          }
        }
      }
    }
  }

  // 2. Падение ПДМ на сушке >5%
  const cutLogs = logs.filter(l => l.macrocycleId === 'cut_10weeks' || l.mode === 'cut');
  if (cutLogs.length >= 2) {
    const last = cutLogs[cutLogs.length - 1];
    const prev = cutLogs[cutLogs.length - 2];
    for (const ex of last.exercises) {
      const prevEx = prev.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (prevEx) {
        const drop = (prevEx.pdm - ex.pdm) / prevEx.pdm;
        if (drop > 0.05) {
          advice.push(`📉 Сушка: ПДМ в "${ex.category}" упал на ${(drop * 100).toFixed(1)}% за последнюю неделю. Рекомендую снизить интенсивность.`);
        }
      }
    }
  }

  // 3. Стагнация ПДМ при росте КПШ
  if (logs.length >= 4) {
    const last = logs[logs.length - 1];
    const first = logs[logs.length - 4];
    for (const ex of last.exercises) {
      const firstEx = first.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (firstEx) {
        const pdmChange = ex.pdm - firstEx.pdm;
        const kpshChange = ex.kpsh - firstEx.kpsh;
        if (pdmChange <= 0 && kpshChange > 5) {
          advice.push(`📊 В упражнении "${ex.category}" КПШ вырос на ${kpshChange}, а ПДМ не увеличился. Попробуй повысить интенсивность.`);
        }
      }
    }
  }

  return advice;
}