import { useState } from 'react';
import type { WorkoutLog, ExerciseLogEntry } from '../utils/storage';
import { updateLogByIndex, loadLogs } from '../utils/storage';

interface EditWorkoutProps {
  log: WorkoutLog;
  index: number; // индекс в массиве логов
  onCancel: () => void;
  onSaved: () => void; // чтобы обновить историю
}

const EditWorkout: React.FC<EditWorkoutProps> = ({ log, index, onCancel, onSaved }) => {
  const [date, setDate] = useState(new Date(log.date).toISOString().slice(0, 10));
  const [exercises, setExercises] = useState<ExerciseLogEntry[]>(log.exercises.map(ex => ({ ...ex })));

  const updateExercise = (exIndex: number, field: string, value: any) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exIndex] = { ...updated[exIndex], [field]: value };
      return updated;
    });
  };

  const updateTopSet = (exIndex: number, field: string, value: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const num = parseFloat(value);
      updated[exIndex] = {
        ...updated[exIndex],
        topSet: { ...updated[exIndex].topSet, [field]: isNaN(num) ? 0 : num },
      };
      return updated;
    });
  };

  const updateBackoffSet = (exIndex: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const newSets = [...updated[exIndex].backoffSets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: parseFloat(value) || 0 };
      updated[exIndex] = { ...updated[exIndex], backoffSets: newSets };
      return updated;
    });
  };

  const addBackoffSet = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exIndex].backoffSets.length >= 10) return prev;
      updated[exIndex] = {
        ...updated[exIndex],
        backoffSets: [...updated[exIndex].backoffSets, { weight: 0, reps: 0 }],
      };
      return updated;
    });
  };

  const removeBackoffSet = (exIndex: number, setIdx: number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exIndex] = {
        ...updated[exIndex],
        backoffSets: updated[exIndex].backoffSets.filter((_, i) => i !== setIdx),
      };
      return updated;
    });
  };

  const handleSave = () => {
    const updatedLog: WorkoutLog = {
      ...log,
      date: new Date(date).toISOString(),
      exercises: exercises,
    };
    updateLogByIndex(index, updatedLog);
    onSaved();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Редактирование тренировки</h2>
      <div style={{ marginBottom: '15px' }}>
        <label>Дата: </label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '5px' }} />
      </div>
      {exercises.map((ex, exIdx) => (
        <div key={exIdx} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
          <h3>{ex.category} (ПДМ: {ex.pdm} кг)</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Топ-сет: вес </label>
            <input
              type="number"
              value={ex.topSet.weight}
              onChange={e => updateTopSet(exIdx, 'weight', e.target.value)}
              style={{ width: '80px', marginRight: '10px' }}
            />
            <label>повторы </label>
            <input
              type="number"
              value={ex.topSet.reps}
              onChange={e => updateTopSet(exIdx, 'reps', e.target.value)}
              style={{ width: '60px', marginRight: '10px' }}
            />
            <label>RPE </label>
            <input
              type="number"
              step="0.5"
              value={ex.topSet.rpe}
              onChange={e => updateTopSet(exIdx, 'rpe', e.target.value)}
              style={{ width: '60px' }}
            />
          </div>
          <div>
            <strong>Бэкоф-сеты:</strong>
            {ex.backoffSets.map((set, setIdx) => (
              <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                <input
                  type="number"
                  placeholder="Вес"
                  value={set.weight || ''}
                  onChange={e => updateBackoffSet(exIdx, setIdx, 'weight', e.target.value)}
                  style={{ width: '70px' }}
                />
                <span>кг x</span>
                <input
                  type="number"
                  placeholder="Повт"
                  value={set.reps || ''}
                  onChange={e => updateBackoffSet(exIdx, setIdx, 'reps', e.target.value)}
                  style={{ width: '60px' }}
                />
                <button onClick={() => removeBackoffSet(exIdx, setIdx)} style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ))}
            {ex.backoffSets.length < 10 && (
              <button onClick={() => addBackoffSet(exIdx)} style={{ marginTop: '5px', padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ➕ Добавить подход
              </button>
            )}
          </div>
          <div style={{ marginTop: '8px' }}>
            <label>RPE последнего подхода: </label>
            <input
              type="number"
              step="0.5"
              min="6"
              max="10"
              value={ex.lastBackoffRPE || ''}
              onChange={e => updateExercise(exIdx, 'lastBackoffRPE', e.target.value ? parseFloat(e.target.value) : null)}
              style={{ width: '60px' }}
            />
          </div>
          <div style={{ marginTop: '5px' }}>
            <label>ПДМ (пересчитать?): </label>
            <input
              type="number"
              value={ex.pdm}
              onChange={e => updateExercise(exIdx, 'pdm', parseFloat(e.target.value) || 0)}
              style={{ width: '80px' }}
            />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={handleSave} style={{ padding: '12px 30px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          СОХРАНИТЬ ИЗМЕНЕНИЯ
        </button>
        <button onClick={onCancel} style={{ padding: '12px 30px', backgroundColor: '#ddd', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          ОТМЕНА
        </button>
      </div>
    </div>
  );
};

export default EditWorkout;