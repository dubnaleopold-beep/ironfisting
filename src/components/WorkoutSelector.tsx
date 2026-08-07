import { useState, Suspense, lazy } from 'react';
import workoutPlan from '../data/workoutPlan';
import exercisesData, { type Exercise } from '../data/exercises';
import ActiveWorkout from './ActiveWorkout';
import History from './History';
import FAQ from './FAQ';
import macrocycles, { type Macrocycle } from '../data/macrocycle';
import {
  getReferencePDM,
  isWeekCompleted,
  isDayCompleted,
  uncompleteDay,
  clearCompletedDays,
} from '../utils/macrocycleStorage';

const WorkoutSelector = () => {
  const [mode, setMode] = useState<'free' | 'macrocycle'>('free');
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);

  // Свободная тренировка
  const [freeSlots, setFreeSlots] = useState<{ id: string; exerciseId: string }[]>([]);
  const [isFreeTrainingStarted, setIsFreeTrainingStarted] = useState(false);

  // Макроцикл
  const [selectedMacrocycleId, setSelectedMacrocycleId] = useState<string | null>(null);
  const [macroWeek, setMacroWeek] = useState<number>(1);
  const [macroModeActive, setMacroModeActive] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Record<string, string>>({});
  const [isStarted, setIsStarted] = useState(false);

  const selectedMacrocycle: Macrocycle | undefined = selectedMacrocycleId
    ? macrocycles.find(m => m.id === selectedMacrocycleId)
    : undefined;

  const currentMicrocycle = selectedMacrocycle
    ? selectedMacrocycle.microcycles.find(m => m.week === macroWeek) || null
    : null;

  const selectedDay = selectedDayIndex !== null ? workoutPlan[selectedDayIndex] : null;

  const getExerciseById = (id: string): Exercise | undefined =>
    exercisesData.find(ex => ex.id === id);

  // Полный сброс на главную (только для кнопки заголовка или свободной тренировки)
  const resetToMain = () => {
    setMode('free');
    setShowHistory(false);
    setShowAnalytics(false);
    setShowFAQ(false);
    setFreeSlots([]);
    setIsFreeTrainingStarted(false);
    setSelectedMacrocycleId(null);
    setMacroModeActive(false);
    setSelectedDayIndex(null);
    setIsStarted(false);
  };

  // Сброс для переключения режимов без смены mode
  const resetStateKeepMode = () => {
    setShowHistory(false);
    setShowAnalytics(false);
    setShowFAQ(false);
    setFreeSlots([]);
    setIsFreeTrainingStarted(false);
    setSelectedMacrocycleId(null);
    setMacroModeActive(false);
    setSelectedDayIndex(null);
    setIsStarted(false);
  };

  // Свободная тренировка – старт
  const startFreeTraining = () => {
    if (freeSlots.length === 0) {
      alert('Добавь хотя бы одно упражнение');
      return;
    }
    setIsFreeTrainingStarted(true);
    const selectedMap: Record<string, string> = {};
    freeSlots.forEach(s => { selectedMap[s.id] = s.exerciseId; });
    setSelectedExercises(selectedMap);
    setSelectedDayIndex(-1);
    setIsStarted(true);
  };

  const addFreeSlot = () => {
    const id = `free-${Date.now()}`;
    setFreeSlots(prev => [...prev, { id, exerciseId: exercisesData[0].id }]);
  };

  const updateFreeSlot = (id: string, newExerciseId: string) => {
    setFreeSlots(prev => prev.map(s => s.id === id ? { ...s, exerciseId: newExerciseId } : s));
  };

  const removeFreeSlot = (id: string) => {
    setFreeSlots(prev => prev.filter(s => s.id !== id));
  };

  // Рендер свободной тренировки
  if (isFreeTrainingStarted && selectedDayIndex === -1) {
    const slots = freeSlots.map(s => ({
      id: s.id,
      category: getExerciseById(s.exerciseId)?.category || '',
      defaultExerciseId: s.exerciseId,
      alternatives: getExerciseById(s.exerciseId)?.alternatives || [s.exerciseId],
    }));
    return (
      <ActiveWorkout
        slots={slots}
        selectedExercises={selectedExercises}
        onFinish={() => {
          setIsFreeTrainingStarted(false);
          setIsStarted(false);
          setFreeSlots([]);
        }}
        dayIndex={-1}
        onBack={() => {
          setIsFreeTrainingStarted(false);
          setIsStarted(false);
        }}
      />
    );
  }

  // Рендер макроцикла (или старого режима, если день выбран)
  if (isStarted && selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDay) {
    return (
      <ActiveWorkout
        slots={selectedDay.slots}
        selectedExercises={selectedExercises}
        onFinish={() => {
          setIsStarted(false);
          setMacroModeActive(false);
        }}
        dayIndex={selectedDayIndex}
        onBack={() => setIsStarted(false)}
        macrocycleId={macroModeActive ? selectedMacrocycleId ?? undefined : undefined}
        currentWeek={macroModeActive ? macroWeek : undefined}
        microcycle={macroModeActive ? currentMicrocycle : undefined}
        referencePDMs={macroModeActive ? getReferencePDM : undefined}
      />
    );
  }

  // История, Аналитика, FAQ
  if (showHistory) {
    return (
      <div>
        <button onClick={() => setShowHistory(false)} style={{ margin: '10px', padding: '8px 16px' }}>← Назад</button>
        <History onBackToMain={() => setShowHistory(false)} />
      </div>
    );
  }

  if (showAnalytics) {
    const AnalyticsLazy = lazy(() => import('./Analytics'));
    return (
      <div>
        <button onClick={() => setShowAnalytics(false)} style={{ margin: '10px', padding: '8px 16px' }}>← Назад</button>
        <Suspense fallback={<p>Загрузка аналитики...</p>}>
          <AnalyticsLazy onBackToMain={() => setShowAnalytics(false)} />
        </Suspense>
      </div>
    );
  }

  if (showFAQ) {
    return (
      <div>
        <button onClick={() => setShowFAQ(false)} style={{ margin: '10px', padding: '8px 16px' }}>← Назад</button>
        <FAQ onBackToMain={() => setShowFAQ(false)} />
      </div>
    );
  }

  // Главное меню
  return (
    <div style={{ padding: '20px' }}>
      <h1 onClick={resetToMain} style={{ cursor: 'pointer', userSelect: 'none' }}>IronFisting</h1>

      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={() => { setMode('free'); resetStateKeepMode(); }}
          style={btnStyle(mode === 'free')}>
          Свободная тренировка
        </button>
        <button onClick={() => { setMode('macrocycle'); resetStateKeepMode(); }}
          style={btnStyle(mode === 'macrocycle')}>
          Макроцикл
        </button>
        <button onClick={() => setShowHistory(true)} style={navBtnStyle}>📊 История</button>
        <button onClick={() => setShowAnalytics(true)} style={navBtnStyle}>📈 Аналитика</button>
        <button onClick={() => setShowFAQ(true)} style={navBtnStyle}>❓ FAQ</button>
      </div>

      {/* Свободная тренировка – редактор списка */}
      {mode === 'free' && (
        <>
          <p>Добавь упражнения в тренировку:</p>
          {freeSlots.map(slot => (
            <div key={slot.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
              <select value={slot.exerciseId} onChange={e => updateFreeSlot(slot.id, e.target.value)} style={{ padding: '5px', flexGrow: 1 }}>
                {exercisesData.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <button onClick={() => removeFreeSlot(slot.id)} style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={addFreeSlot} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            ➕ Добавить упражнение
          </button>
          {freeSlots.length > 0 && (
            <button onClick={startFreeTraining} style={{ marginLeft: '10px', padding: '8px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              НАЧАТЬ ТРЕНИРОВКУ
            </button>
          )}
        </>
      )}

      {/* Макроцикл – выбор программы */}
      {mode === 'macrocycle' && !selectedMacrocycleId && (
        <div style={{ marginTop: '20px' }}>
          <p>Выбери программу:</p>
          {macrocycles.map(mc => (
            <div key={mc.id} onClick={() => { setSelectedMacrocycleId(mc.id); setMacroWeek(1); }}
              style={cardStyle}>
              <h3>{mc.name}</h3>
              <p>{mc.description}</p>
              <p><strong>Длительность:</strong> {mc.durationWeeks} недель</p>
            </div>
          ))}
          <button onClick={() => setMode('free')} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#ddd', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Назад</button>
        </div>
      )}

      {/* Макроцикл – выбор недели и дней */}
      {mode === 'macrocycle' && selectedMacrocycleId && !macroModeActive && selectedMacrocycle && (
        <div style={{ marginTop: '20px' }}>
          <p><strong>{selectedMacrocycle.name}</strong> — выбери неделю (1–{selectedMacrocycle.durationWeeks}):</p>
          <select value={macroWeek} onChange={e => setMacroWeek(Number(e.target.value))} style={{ padding: '8px', fontSize: '16px', marginRight: '10px' }}>
            {selectedMacrocycle.microcycles.map(mc => {
              const weekDone = isWeekCompleted(selectedMacrocycle.id, mc.week);
              return <option key={mc.week} value={mc.week}>{weekDone ? '✅ ' : ''}Неделя {mc.week} — {mc.phase} {weekDone ? '(выполнена)' : ''}</option>;
            })}
          </select>

          {currentMicrocycle && (
            <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
              <p><strong>Фаза:</strong> {currentMicrocycle.phase}</p>
              <p><strong>Топ-сет:</strong> {currentMicrocycle.topSetReps} повт. @ RPE {currentMicrocycle.topSetTargetRPE}</p>
              <p><strong>Бэкоф-сеты:</strong> {currentMicrocycle.backoffSetsCount} подхода по {currentMicrocycle.backoffPercent * 100}% от ПДМ, 5 повторений</p>
              {currentMicrocycle.isDeload && <p>⚠️ Это разгрузочная неделя!</p>}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <p><strong>Дни этой недели:</strong></p>
            {workoutPlan.map((day, idx) => {
              const completed = isDayCompleted(selectedMacrocycle.id, macroWeek, idx);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <button
                    onClick={() => {
                      setSelectedDayIndex(idx);
                      const defaults: Record<string, string> = {};
                      day.slots.forEach(slot => { defaults[slot.id] = slot.defaultExerciseId; });
                      setSelectedExercises(defaults);
                      setIsStarted(true);
                    }}
                    style={{ padding: '10px 20px', backgroundColor: completed ? '#4CAF50' : '#ddd', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {completed ? '✅ ' : ''}{day.name}
                  </button>
                  {completed && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Отменить выполнение дня "${day.name}" на неделе ${macroWeek}?`)) {
                          uncompleteDay(selectedMacrocycle.id, macroWeek, idx);
                          setMacroWeek(macroWeek);
                        }
                      }}
                      style={{ padding: '4px 10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ↩️ Отменить
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => setSelectedMacrocycleId(null)} style={{ marginTop: '20px', padding: '8px 16px', backgroundColor: '#ddd', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>← Назад к выбору программы</button>
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => {
              if (window.confirm(`Сбросить все отметки выполнения для программы "${selectedMacrocycle.name}"?`)) {
                clearCompletedDays(selectedMacrocycle.id);
                setMacroWeek(macroWeek);
              }
            }} style={{ padding: '6px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              🗑️ Сбросить весь прогресс
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  backgroundColor: active ? '#4CAF50' : '#ddd',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
});

const navBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: '5px',
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '15px',
  marginBottom: '10px',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: '#fafafa',
};

export default WorkoutSelector;