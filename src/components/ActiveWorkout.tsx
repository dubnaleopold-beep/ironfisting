import { useState, useEffect } from 'react';
import type { ExerciseSlot } from '../data/workoutPlan';
import exercisesData from '../data/exercises';
import { calculatePDM, getPercentPM } from '../data/rpeTable';
import { getLastPDM, saveLog, loadDraft, removeDraft, saveDraft } from '../utils/storage';
import type { ExerciseLogEntry, WorkoutLog } from '../utils/storage';
import { checkDeload, checkDeloadWithReference } from '../utils/deload';
import { completeWeek, saveReferencePDM, getReferencePDM } from '../utils/macrocycleStorage';
import type { Microcycle } from '../data/macrocycle';
import { generateWarmupSets, type WarmupSet } from '../utils/warmupGenerator';

interface ExerciseEntry {
  slotCategory: string;
  exerciseId: string;
  topSetWeight: number | string;
  topSetReps: number | string;
  topSetRPE: number | string;
  pdm: number | null;
  backoffSets: { weight: number; reps: number }[];
  lastBackoffRPE: number | string;
  warmupSets: WarmupSet[];
  warmupChecked: boolean[];
  bodyweight?: number | string;
}

interface DeloadResult {
  shouldDeload: boolean;
  percentDrop: number;
  recommendedBackoffWeight: number;
  recommendedBackoffSets: number;
}

interface ActiveWorkoutProps {
  slots: ExerciseSlot[];
  selectedExercises: Record<string, string>;
  onFinish: () => void;
  dayIndex: number;
  onBack?: () => void;
  macrocycleId?: string;
  currentWeek?: number;
  microcycle?: Microcycle | null;
  referencePDMs?: ((exerciseId: string) => number | null) | null;
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  slots,
  selectedExercises,
  onFinish,
  dayIndex,
  onBack,
  macrocycleId,
  currentWeek,
  microcycle,
  referencePDMs,
}) => {
  const [trainingDate, setTrainingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<Record<string, ExerciseEntry>>(() => {
    const draft = loadDraft();
    const initEntry = (slot: ExerciseSlot): ExerciseEntry => {
      const ex = exercisesData.find(e => e.id === (selectedExercises[slot.category] || slot.defaultExerciseId));
      return {
        slotCategory: slot.category,
        exerciseId: selectedExercises[slot.category] || slot.defaultExerciseId,
        topSetWeight: '',
        topSetReps: '',
        topSetRPE: '',
        pdm: null,
        backoffSets: [],
        lastBackoffRPE: '',
        warmupSets: [],
        warmupChecked: [],
        bodyweight: '',
      };
    };

    if (draft && draft.dayIndex === dayIndex) {
      const restored: Record<string, ExerciseEntry> = {};
      slots.forEach(slot => {
        const saved = draft.entries[slot.category];
        const def = initEntry(slot);
        restored[slot.category] = {
          ...def,
          ...saved,
          warmupSets: saved?.warmupSets || [],
          warmupChecked: saved?.warmupChecked || [],
          bodyweight: saved?.bodyweight || '',
        };
      });
      return restored;
    }
    const initial: Record<string, ExerciseEntry> = {};
    slots.forEach(slot => { initial[slot.category] = initEntry(slot); });
    return initial;
  });

  const [deloadInfo, setDeloadInfo] = useState<Record<string, DeloadResult | null>>({});

  useEffect(() => {
    const draft = { dayIndex, entries };
    saveDraft(draft);
  }, [entries, dayIndex]);

  // Генерация разминки для макроцикла
  useEffect(() => {
    if (!macrocycleId || !microcycle || !currentWeek || currentWeek <= 1) return;
    setEntries(prev => {
      const updated = { ...prev };
      slots.forEach(slot => {
        const entry = updated[slot.category];
        const exercise = exercisesData.find(e => e.id === entry.exerciseId);
        if (!exercise || exercise.protocol === 'free') return;
        const prevPDM = getLastPDM(entry.exerciseId);
        if (!prevPDM) return;
        let topSetTargetPercent = 0.80;
        try {
          topSetTargetPercent = getPercentPM(microcycle.topSetReps, microcycle.topSetTargetRPE);
        } catch {}
        const warmup = generateWarmupSets({
          previousPDM: prevPDM,
          targetTopSetPercent: topSetTargetPercent,
          warmupType: exercise.warmupType,
          bodyweight: exercise.needsBodyweight ? parseFloat(entry.bodyweight as string) || undefined : undefined,
        });
        updated[slot.category] = {
          ...entry,
          warmupSets: warmup,
          warmupChecked: warmup.map(() => false),
        };
      });
      return updated;
    });
  }, [macrocycleId, microcycle, currentWeek, slots]);

  const updateField = (
    category: string,
    field: 'topSetWeight' | 'topSetReps' | 'topSetRPE' | 'lastBackoffRPE' | 'bodyweight',
    value: string
  ) => {
    setEntries(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
        pdm: field !== 'lastBackoffRPE' && field !== 'bodyweight' ? null : prev[category].pdm,
        backoffSets: field !== 'lastBackoffRPE' && field !== 'bodyweight' ? [] : prev[category].backoffSets,
      },
    }));
    setDeloadInfo(prev => ({ ...prev, [category]: null }));
  };

  const toggleWarmupCheck = (category: string, index: number) => {
    setEntries(prev => {
      const current = prev[category];
      const newChecked = [...current.warmupChecked];
      newChecked[index] = !newChecked[index];
      return { ...prev, [category]: { ...current, warmupChecked: newChecked } };
    });
  };

  // Ручное управление подходами
  const addBackoffSet = (category: string) => {
    setEntries(prev => {
      const current = prev[category];
      if (current.backoffSets.length >= 5) return prev;
      return {
        ...prev,
        [category]: {
          ...current,
          backoffSets: [...current.backoffSets, { weight: 0, reps: 0 }],
        },
      };
    });
  };

  const updateBackoffSet = (category: string, index: number, field: 'weight' | 'reps', value: string) => {
    setEntries(prev => {
      const current = prev[category];
      const newSets = [...current.backoffSets];
      newSets[index] = { ...newSets[index], [field]: parseFloat(value) || 0 };
      return {
        ...prev,
        [category]: { ...current, backoffSets: newSets },
      };
    });
  };

  const removeBackoffSet = (category: string, index: number) => {
    setEntries(prev => {
      const current = prev[category];
      const newSets = current.backoffSets.filter((_, i) => i !== index);
      return {
        ...prev,
        [category]: { ...current, backoffSets: newSets },
      };
    });
  };

  const handleCalculate = (category: string) => {
    const entry = entries[category];
    const weight = parseFloat(entry.topSetWeight as string);
    const reps = parseInt(entry.topSetReps as string, 10);
    const rpe = parseFloat(entry.topSetRPE as string);
    if (Number.isNaN(weight) || Number.isNaN(reps) || Number.isNaN(rpe)) {
      alert('Заполни вес, повторения и RPE числом!');
      return;
    }
    try {
      const pdm = calculatePDM(weight, reps, rpe);
      const exercise = exercisesData.find(ex => ex.id === entry.exerciseId);
      const isFreeProtocol = exercise?.protocol === 'free';
      const isFreeMode = !macrocycleId;

      let backoffSets: { weight: number; reps: number }[] = [];
      let deloadDecision: DeloadResult = { shouldDeload: false, percentDrop: 0, recommendedBackoffWeight: 0, recommendedBackoffSets: 2 };

      if (!isFreeProtocol && !isFreeMode) {
        // Макроцикл: автоматический расчёт
        const prevPDM = getLastPDM(entry.exerciseId);
        const backoffPercent = microcycle ? microcycle.backoffPercent : 0.775;
        const baseBackoffWeight = Math.round((pdm * backoffPercent) / 2.5) * 2.5;
        const baseBackoffSets = microcycle ? microcycle.backoffSetsCount : 2;
        const refPDM = referencePDMs ? referencePDMs(entry.exerciseId) : null;
        if (macrocycleId && refPDM !== null) {
          deloadDecision = checkDeloadWithReference(pdm, prevPDM, refPDM, baseBackoffWeight, baseBackoffSets);
        } else {
          deloadDecision = checkDeload(pdm, prevPDM, baseBackoffWeight, baseBackoffSets);
        }
        if (deloadDecision.shouldDeload) {
          backoffSets = Array.from({ length: deloadDecision.recommendedBackoffSets }, () => ({ weight: deloadDecision.recommendedBackoffWeight, reps: 5 }));
        } else {
          backoffSets = Array.from({ length: baseBackoffSets }, () => ({ weight: baseBackoffWeight, reps: 5 }));
        }
      } else if (!isFreeProtocol && isFreeMode) {
        // Свободный режим: очищаем подходы (пользователь добавит сам)
        backoffSets = [];
      }

      setEntries(prev => ({ ...prev, [category]: { ...prev[category], pdm, backoffSets } }));
      setDeloadInfo(prev => ({ ...prev, [category]: deloadDecision }));
    } catch (e: any) {
      alert(e.message || 'Ошибка в расчёте.');
    }
  };

  const getExerciseName = (id: string) => {
    const ex = exercisesData.find(e => e.id === id);
    return ex?.name || id;
  };

  const handleFinish = () => {
    const logExercises: ExerciseLogEntry[] = Object.values(entries)
      .filter(e => e.pdm !== null && e.pdm! > 0)
      .map(e => {
        let tonnage = 0, kpsh = 0;
        const tw = parseFloat(e.topSetWeight as string);
        const tr = parseInt(e.topSetReps as string, 10);
        const trpe = parseFloat(e.topSetRPE as string);
        if (!isNaN(tw) && !isNaN(tr)) { tonnage += tw * tr; kpsh += tr; }
        e.backoffSets.forEach(s => { tonnage += s.weight * s.reps; kpsh += s.reps; });
        return {
          exerciseId: e.exerciseId,
          category: e.slotCategory,
          pdm: e.pdm!,
          tonnage,
          kpsh,
          topSet: { weight: isNaN(tw) ? 0 : tw, reps: isNaN(tr) ? 0 : tr, rpe: isNaN(trpe) ? 0 : trpe },
          backoffSets: e.backoffSets,
          lastBackoffRPE: parseFloat(e.lastBackoffRPE as string) || null,
        };
      });

    const log: WorkoutLog = {
      date: new Date(trainingDate).toISOString(),
      dayName: `Тренировка ${dayIndex + 1}`,
      exercises: logExercises,
      mode: macrocycleId ? 'macrocycle' : 'free',
      macrocycleId: macrocycleId || undefined,
      week: currentWeek,
    };
    saveLog(log);
    if (macrocycleId && currentWeek) {
      completeWeek(macrocycleId, currentWeek);
      logExercises.forEach(e => {
        if (getReferencePDM(e.exerciseId) === null) saveReferencePDM(e.exerciseId, e.pdm);
      });
    }
    removeDraft();
    onFinish();
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={() => { if (onBack) onBack(); else onFinish(); }}
          style={{ marginRight: '15px', padding: '5px 10px', fontSize: '18px', background: 'none', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>
          ← Назад
        </button>
        <h2 style={{ margin: 0, cursor: 'pointer' }} onClick={() => { if (onBack) onBack(); else onFinish(); }}>
          IronFisting {macrocycleId ? `· нед. ${currentWeek}` : '(свободная)'}
        </h2>
      </div>
      {slots.map(slot => {
        const entry = entries[slot.category];
        const ex = exercisesData.find(e => e.id === entry.exerciseId);
        const isFree = ex?.protocol === 'free';
        const isFreeMode = !macrocycleId;
        const prevPDM = getLastPDM(entry.exerciseId);
        const suggestionLow = prevPDM ? Math.round((prevPDM * 0.825) / 2.5) * 2.5 : null;
        const suggestionHigh = prevPDM ? Math.round((prevPDM * 0.85) / 2.5) * 2.5 : null;
        const targetReps = microcycle ? microcycle.topSetReps : null;
        const targetRPE = microcycle ? microcycle.topSetTargetRPE : null;
        let topSetPercent: number | null = null;
        if (entry.pdm && entry.topSetReps && entry.topSetRPE) {
          try { topSetPercent = getPercentPM(parseInt(entry.topSetReps as string, 10), parseFloat(entry.topSetRPE as string)) * 100; } catch {}
        }
        const showWarmup = macrocycleId && currentWeek && currentWeek > 1 && !isFree && entry.warmupSets.length > 0;

        return (
          <div key={slot.category} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '15px', borderRadius: '8px' }}>
            <h3>{getExerciseName(entry.exerciseId)} ({slot.category})</h3>
            {slot.alternatives.length > 1 && (
              <div style={{ marginBottom: '10px' }}>
                <label>Заменить: </label>
                <select value={entry.exerciseId} onChange={e => {
                  const newId = e.target.value;
                  setEntries(prev => ({ ...prev, [slot.category]: { ...prev[slot.category], exerciseId: newId, topSetWeight: '', topSetReps: '', topSetRPE: '', pdm: null, backoffSets: [], lastBackoffRPE: '', warmupSets: [], warmupChecked: [] } }));
                  setDeloadInfo(prev => ({ ...prev, [slot.category]: null }));
                }} style={{ padding: '5px' }}>
                  {slot.alternatives.map(altId => <option key={altId} value={altId}>{exercisesData.find(e => e.id === altId)?.name || altId}</option>)}
                </select>
              </div>
            )}

            {ex?.needsBodyweight && (
              <div style={{ marginBottom: '10px' }}>
                <label>Свой вес (кг): </label>
                <input type="number" value={entry.bodyweight || ''} onChange={e => updateField(slot.category, 'bodyweight', e.target.value)} style={{ width: '70px' }} />
              </div>
            )}

            {macrocycleId && currentWeek === 1 && !isFree && (
              <div style={{ background: '#f9f9f9', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                Первая неделя — выполни разминку самостоятельно. Со следующей недели она будет рассчитана автоматически.
              </div>
            )}
            {showWarmup && (
              <div style={{ marginBottom: '15px' }}>
                <p><strong>Разминка:</strong></p>
                {entry.warmupSets.map((ws, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input type="checkbox" checked={entry.warmupChecked[idx] || false} onChange={() => toggleWarmupCheck(slot.category, idx)} />
                    {ws.isBodyweight ? `Свой вес` : `${ws.weight} кг`} × {ws.reps}
                  </label>
                ))}
              </div>
            )}

            {/* Топ-сет и бэкоф-сеты для не-free */}
            {!isFree ? (
              <>
                {microcycle && <div style={{ background: '#e8f0fe', padding: '8px', marginBottom: '10px', borderRadius: '5px', fontSize: '0.9em' }}>Цель: {targetReps} повт. @ RPE {targetRPE}</div>}
                {prevPDM && (
                  <div style={{ background: '#e8f0fe', padding: '8px', marginBottom: '10px', borderRadius: '5px', fontSize: '0.9em' }}>
                    <p style={{ margin: 0 }}>Рекомендуемый вес топ-сета (82.5–85% от прошлого ПДМ {prevPDM} кг):</p>
                    <p style={{ margin: '2px 0' }}>82.5%: <strong>{suggestionLow} кг</strong> | 85%: <strong>{suggestionHigh} кг</strong></p>
                  </div>
                )}
                <div style={{ marginBottom: '10px' }}>
                  <label>Топ-сет: вес (кг) </label>
                  <input type="number" value={entry.topSetWeight} onChange={e => updateField(slot.category, 'topSetWeight', e.target.value)} style={{ width: '80px', marginRight: '10px' }} />
                  <label>Повторы </label>
                  <input type="number" value={entry.topSetReps} onChange={e => updateField(slot.category, 'topSetReps', e.target.value)} style={{ width: '60px', marginRight: '10px' }} />
                  <label>RPE </label>
                  <input type="number" step="0.5" min="6" max="10" value={entry.topSetRPE} onChange={e => updateField(slot.category, 'topSetRPE', e.target.value)} style={{ width: '60px' }} />
                  <button onClick={() => handleCalculate(slot.category)} style={{ marginLeft: '10px', padding: '5px 15px' }}>Рассчитать</button>
                </div>
                {entry.pdm !== null && (
                  <div style={{ background: '#f0f0f0', padding: '10px' }}>
                    <p>ПДМ: <strong>{entry.pdm} кг</strong></p>
                    {topSetPercent && <p>Топ-сет: {entry.topSetWeight} кг x {entry.topSetReps} — <strong>{topSetPercent.toFixed(0)}% от ПДМ</strong></p>}
                    <p><strong>Подходы:</strong></p>
                    {entry.backoffSets.map((set, idx) => {
                      const pct = entry.pdm! > 0 ? ((set.weight / entry.pdm!) * 100).toFixed(0) : '0';
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <input
                            type="number"
                            placeholder="Вес"
                            value={set.weight || ''}
                            onChange={e => updateBackoffSet(slot.category, idx, 'weight', e.target.value)}
                            style={{ width: '70px' }}
                          />
                          <span>кг x</span>
                          <input
                            type="number"
                            placeholder="Повт"
                            value={set.reps || ''}
                            onChange={e => updateBackoffSet(slot.category, idx, 'reps', e.target.value)}
                            style={{ width: '60px' }}
                          />
                          <span>— {pct}% ПДМ</span>
                          <button onClick={() => removeBackoffSet(slot.category, idx)} style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {entry.backoffSets.length < 5 && (
                      <button onClick={() => addBackoffSet(slot.category)} style={{ marginTop: '5px', padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        ➕ Добавить подход
                      </button>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <label>RPE последнего подхода: </label>
                      <input
                        type="number"
                        step="0.5"
                        min="6"
                        max="10"
                        value={entry.lastBackoffRPE}
                        onChange={e => updateField(slot.category, 'lastBackoffRPE', e.target.value)}
                        style={{ width: '60px' }}
                      />
                    </div>
                  </div>
                )}
                {deloadInfo[slot.category]?.shouldDeload && (
                  <div style={{ background: '#fff3cd', padding: '8px', marginTop: '8px', borderRadius: '5px' }}>
                    ⚠️ ПДМ упал на {deloadInfo[slot.category]!.percentDrop.toFixed(1)}% по сравнению с прошлой тренировкой. Применена разгрузка.
                  </div>
                )}
              </>
            ) : (
              /* Свободный режим для free-упражнений */
              <>
                <p style={{ fontStyle: 'italic' }}>Свободный режим — добавь подходы:</p>
                {entry.backoffSets.map((set, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <input
                      type="number"
                      placeholder="Вес"
                      value={set.weight || ''}
                      onChange={e => updateBackoffSet(slot.category, idx, 'weight', e.target.value)}
                      style={{ width: '70px' }}
                    />
                    <span>кг x</span>
                    <input
                      type="number"
                      placeholder="Повт"
                      value={set.reps || ''}
                      onChange={e => updateBackoffSet(slot.category, idx, 'reps', e.target.value)}
                      style={{ width: '60px' }}
                    />
                    <button onClick={() => removeBackoffSet(slot.category, idx)} style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px' }}>
                      ✕
                    </button>
                  </div>
                ))}
                {entry.backoffSets.length < 10 && (
                  <button onClick={() => addBackoffSet(slot.category)} style={{ marginTop: '5px', padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ➕ Добавить подход
                  </button>
                )}
                <div style={{ marginTop: '10px' }}>
                  <label>RPE последнего подхода: </label>
                  <input
                    type="number"
                    step="0.5"
                    min="6"
                    max="10"
                    value={entry.lastBackoffRPE}
                    onChange={e => updateField(slot.category, 'lastBackoffRPE', e.target.value)}
                    style={{ width: '60px' }}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: '20px' }}>
        <label>Дата тренировки: </label>
        <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} style={{ padding: '5px', marginRight: '10px' }} />
        <button onClick={handleFinish} style={{ padding: '12px 30px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          ЗАВЕРШИТЬ ТРЕНИРОВКУ
        </button>
      </div>
    </div>
  );
};

export default ActiveWorkout;