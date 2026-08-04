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
  uncompleteWeek,
  clearCompletedWeeks,
} from '../utils/macrocycleStorage';

const WorkoutSelector = () => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Record<string, string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'free' | 'macrocycle'>('free');
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);

  const [selectedMacrocycleId, setSelectedMacrocycleId] = useState<string | null>(null);
  const [macroWeek, setMacroWeek] = useState<number>(1);
  const [macroModeActive, setMacroModeActive] = useState(false);

  const selectedMacrocycle: Macrocycle | undefined = selectedMacrocycleId
    ? macrocycles.find(m => m.id === selectedMacrocycleId)
    : undefined;

  const currentMicrocycle = selectedMacrocycle
    ? selectedMacrocycle.microcycles.find(m => m.week === macroWeek) || null
    : null;

  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    const day = workoutPlan[index];
    const defaults: Record<string, string> = {};
    day.slots.forEach((slot) => {
      defaults[slot.category] = slot.defaultExerciseId;
    });
    setSelectedExercises(defaults);
    setIsStarted(false);
  };

  const handleExerciseChange = (category: string, newExerciseId: string) => {
    setSelectedExercises((prev) => ({
      ...prev,
      [category]: newExerciseId,
    }));
  };

  const getExerciseById = (id: string): Exercise | undefined =>
    exercisesData.find((ex) => ex.id === id);

  const selectedDay = selectedDayIndex !== null ? workoutPlan[selectedDayIndex] : null;

  // FAQ
  if (showFAQ) {
    return (
      <div>
        <button onClick={() => setShowFAQ(false)} style={{ margin: '10px', padding: '8px 16px' }}>
          ← Назад
        </button>
        <FAQ onBackToMain={() => setShowFAQ(false)} />
      </div>
    );
  }

  // История
  if (showHistory) {
    return (
      <div>
        <button onClick={() => setShowHistory(false)} style={{ margin: '10px', padding: '8px 16px' }}>
          ← Назад
        </button>
        <History onBackToMain={() => setShowHistory(false)} />
      </div>
    );
  }

  // Аналитика (динамическая загрузка)
  if (showAnalytics) {
    const AnalyticsLazy = lazy(() => import('./Analytics'));
    return (
      <div>
        <button onClick={() => setShowAnalytics(false)} style={{ margin: '10px', padding: '8px 16px' }}>
          ← Назад
        </button>
        <Suspense fallback={<p>Загрузка аналитики...</p>}>
          <AnalyticsLazy onBackToMain={() => setShowAnalytics(false)} />
        </Suspense>
      </div>
    );
  }

  // Тренировка началась
  if (isStarted && selectedDay) {
    return (
      <ActiveWorkout
        slots={selectedDay.slots}
        selectedExercises={selectedExercises}
        onFinish={() => {
          setIsStarted(false);
          setMacroModeActive(false);
        }}
        dayIndex={selectedDayIndex!}
        onBack={() => setIsStarted(false)}
        macrocycleId={macroModeActive ? selectedMacrocycleId ?? undefined : undefined}
        currentWeek={macroModeActive ? macroWeek : undefined}
        microcycle={macroModeActive ? currentMicrocycle : undefined}
        referencePDMs={macroModeActive ? getReferencePDM : undefined}
      />
    );
  }

  // Главное меню
  return (
    <div style={{ padding: '20px' }}>
      <h1
        onClick={() => {
          setMode('free');
          setSelectedDayIndex(null);
          setIsStarted(false);
          setShowHistory(false);
          setShowAnalytics(false);
          setShowFAQ(false);
          setSelectedMacrocycleId(null);
          setMacroModeActive(false);
        }}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        IronFisting
      </h1>

      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => { setMode('free'); setMacroModeActive(false); setIsStarted(false); }}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'free' ? '#4CAF50' : '#ddd',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Свободная тренировка
        </button>
        <button
          onClick={() => { setMode('macrocycle'); setIsStarted(false); setMacroModeActive(false); }}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'macrocycle' ? '#4CAF50' : '#ddd',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Макроцикл
        </button>
        <button
          onClick={() => setShowHistory(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          📊 История
        </button>
        <button
          onClick={() => setShowAnalytics(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          📈 Аналитика
        </button>
        <button
          onClick={() => setShowFAQ(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          ❓ FAQ
        </button>
      </div>

      {/* Свободная тренировка */}
      {mode === 'free' && (
        <>
          <p>Выбери день тренировки:</p>
          <div style={{ marginBottom: '20px' }}>
            {workoutPlan.map((day, index) => (
              <button
                key={day.name}
                onClick={() => handleDaySelect(index)}
                style={{
                  marginRight: '10px',
                  padding: '10px 20px',
                  fontWeight: selectedDayIndex === index ? 'bold' : 'normal',
                  backgroundColor: selectedDayIndex === index ? '#4CAF50' : '#ddd',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                {day.name}
              </button>
            ))}
          </div>

          {selectedDay && (
            <div>
              <h2>{selectedDay.name}</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selectedDay.slots.map((slot) => {
                  const currentExerciseId = selectedExercises[slot.category] || slot.defaultExerciseId;
                  const currentExercise = getExerciseById(currentExerciseId);
                  return (
                    <li
                      key={slot.category}
                      style={{
                        marginBottom: '15px',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong>{slot.category}</strong>
                        <br />
                        Текущее: {currentExercise?.name || 'Не выбрано'}
                      </div>
                      {slot.alternatives.length > 1 && (
                        <select
                          value={currentExerciseId}
                          onChange={(e) => handleExerciseChange(slot.category, e.target.value)}
                          style={{ padding: '5px' }}
                        >
                          {slot.alternatives.map((altId) => {
                            const altEx = getExerciseById(altId);
                            return (
                              <option key={altId} value={altId}>
                                {altEx?.name || altId}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => setIsStarted(true)}
                style={{
                  marginTop: '20px',
                  padding: '12px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                НАЧАТЬ ТРЕНИРОВКУ
              </button>
            </div>
          )}
        </>
      )}

      {/* Макроцикл – выбор цели */}
      {mode === 'macrocycle' && !selectedMacrocycleId && (
        <div style={{ marginTop: '20px' }}>
          <p>Выбери программу:</p>
          {macrocycles.map(mc => (
            <div
              key={mc.id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#fafafa',
              }}
              onClick={() => {
                setSelectedMacrocycleId(mc.id);
                setMacroWeek(1);
              }}
            >
              <h3>{mc.name}</h3>
              <p>{mc.description}</p>
              <p><strong>Длительность:</strong> {mc.durationWeeks} недель</p>
            </div>
          ))}
          <button
            onClick={() => setMode('free')}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#ddd',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Назад
          </button>
        </div>
      )}

      {/* Макроцикл – выбор недели */}
      {mode === 'macrocycle' && selectedMacrocycleId && !macroModeActive && selectedMacrocycle && (
        <div style={{ marginTop: '20px' }}>
          <p>
            <strong>{selectedMacrocycle.name}</strong> — выбери неделю (1–{selectedMacrocycle.durationWeeks}):
          </p>
          <select
            value={macroWeek}
            onChange={(e) => setMacroWeek(Number(e.target.value))}
            style={{ padding: '8px', fontSize: '16px', marginRight: '10px' }}
          >
            {selectedMacrocycle.microcycles.map(mc => {
              const completed = isWeekCompleted(selectedMacrocycle.id, mc.week);
              return (
                <option key={mc.week} value={mc.week}>
                  {completed ? '✅ ' : ''}Неделя {mc.week} — {mc.phase} {completed ? '(выполнена)' : ''}
                </option>
              );
            })}
          </select>

          {isWeekCompleted(selectedMacrocycle.id, macroWeek) && (
            <button
              onClick={() => {
                if (window.confirm(`Отменить выполнение недели ${macroWeek}?`)) {
                  uncompleteWeek(selectedMacrocycle.id, macroWeek);
                  setMacroWeek(macroWeek);
                }
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              ↩️ Отменить выполнение
            </button>
          )}

          {currentMicrocycle && (
            <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
              <p><strong>Фаза:</strong> {currentMicrocycle.phase}</p>
              <p><strong>Топ-сет:</strong> {currentMicrocycle.topSetReps} повт. @ RPE {currentMicrocycle.topSetTargetRPE}</p>
              <p><strong>Бэкоф-сеты:</strong> {currentMicrocycle.backoffSetsCount} подхода по {currentMicrocycle.backoffPercent * 100}% от ПДМ, 5 повторений</p>
              {currentMicrocycle.isDeload && <p>⚠️ Это разгрузочная неделя!</p>}
            </div>
          )}

          <button
            onClick={() => setMacroModeActive(true)}
            style={{
              marginTop: '15px',
              padding: '12px 30px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ПРОДОЛЖИТЬ К ВЫБОРУ ДНЯ
          </button>
          <button
            onClick={() => setSelectedMacrocycleId(null)}
            style={{
              marginLeft: '10px',
              padding: '12px 30px',
              backgroundColor: '#ddd',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← Назад к выбору программы
          </button>

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                if (window.confirm(`Сбросить все отметки выполнения для программы "${selectedMacrocycle.name}"?`)) {
                  clearCompletedWeeks(selectedMacrocycle.id);
                  setMacroWeek(1);
                }
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              🗑️ Сбросить весь прогресс
            </button>
          </div>
        </div>
      )}

      {/* Выбор дня для активного макроцикла */}
      {mode === 'macrocycle' && macroModeActive && selectedMacrocycle && (
        <>
          <p>
            <strong>{selectedMacrocycle.name}</strong> — Неделя {macroWeek} ({currentMicrocycle?.phase})
          </p>
          <p>Выбери день тренировки:</p>
          <div style={{ marginBottom: '20px' }}>
            {workoutPlan.map((day, index) => (
              <button
                key={day.name}
                onClick={() => handleDaySelect(index)}
                style={{
                  marginRight: '10px',
                  padding: '10px 20px',
                  fontWeight: selectedDayIndex === index ? 'bold' : 'normal',
                  backgroundColor: selectedDayIndex === index ? '#4CAF50' : '#ddd',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                {day.name}
              </button>
            ))}
          </div>

          {selectedDay && (
            <div>
              <h2>{selectedDay.name}</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selectedDay.slots.map((slot) => {
                  const currentExerciseId = selectedExercises[slot.category] || slot.defaultExerciseId;
                  const currentExercise = getExerciseById(currentExerciseId);
                  return (
                    <li
                      key={slot.category}
                      style={{
                        marginBottom: '15px',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong>{slot.category}</strong>
                        <br />
                        Текущее: {currentExercise?.name || 'Не выбрано'}
                      </div>
                      {slot.alternatives.length > 1 && (
                        <select
                          value={currentExerciseId}
                          onChange={(e) => handleExerciseChange(slot.category, e.target.value)}
                          style={{ padding: '5px' }}
                        >
                          {slot.alternatives.map((altId) => {
                            const altEx = getExerciseById(altId);
                            return (
                              <option key={altId} value={altId}>
                                {altEx?.name || altId}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => setIsStarted(true)}
                style={{
                  marginTop: '20px',
                  padding: '12px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                НАЧАТЬ ТРЕНИРОВКУ
              </button>
              <button
                onClick={() => setMacroModeActive(false)}
                style={{
                  marginLeft: '10px',
                  padding: '12px 30px',
                  backgroundColor: '#ddd',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Назад к выбору недели
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutSelector;