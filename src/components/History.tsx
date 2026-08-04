import { useEffect, useState } from 'react';
import { loadLogs, deleteLogByIndex, clearAllLogs, importLogsFromCSV } from '../utils/storage';
import type { WorkoutLog } from '../utils/storage';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import EditWorkout from './EditWorkout';

interface HistoryProps {
  onBackToMain: () => void;
}

const MAX_BACKOFF_SETS = 5;

const History: React.FC<HistoryProps> = ({ onBackToMain }) => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('barbell_bench');
  const [editingLog, setEditingLog] = useState<{ log: WorkoutLog; index: number } | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadLogs();
    loaded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setLogs(loaded);
  }, []);

  const refreshLogs = () => {
    const loaded = loadLogs();
    loaded.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setLogs(loaded);
    setEditingLog(null);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Удалить эту тренировку?')) {
      deleteLogByIndex(index);
      refreshLogs();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Удалить ВСЮ историю? Это необратимо!')) {
      clearAllLogs();
      refreshLogs();
    }
  };

  // Экспорт с Exercise ID
  const exportToCSV = () => {
    const sep = ';';
    const rows: string[] = [];

    const headerCols = [
      'Дата', 'День', 'Цикл', 'Exercise ID', 'Упражнение', 'ПДМ (кг)', 'Тоннаж (кг)', 'КПШ',
      'Топ-сет вес (кг)', 'Топ-сет повторы', 'Топ-сет RPE'
    ];
    for (let i = 1; i <= MAX_BACKOFF_SETS; i++) {
      headerCols.push(`Бэкоф-сет ${i} вес (кг)`);
      headerCols.push(`Бэкоф-сет ${i} повторы`);
    }
    headerCols.push('RPE последнего подхода');
    rows.push(headerCols.join(sep));

    logs.forEach(log => {
      const date = new Date(log.date).toLocaleDateString('ru-RU');
      const cycle = log.macrocycleId ? `${log.macrocycleId} нед.${log.week || ''}` : 'свободная';
      log.exercises.forEach(ex => {
        const cols = [
          date,
          log.dayName,
          cycle,
          ex.exerciseId,
          ex.category,
          ex.pdm.toString(),
          (ex.tonnage || 0).toString(),
          (ex.kpsh || 0).toString(),
          ex.topSet?.weight?.toString() || '',
          ex.topSet?.reps?.toString() || '',
          ex.topSet?.rpe?.toString() || ''
        ];
        for (let i = 0; i < MAX_BACKOFF_SETS; i++) {
          if (i < (ex.backoffSets?.length || 0)) {
            cols.push(ex.backoffSets[i].weight.toString());
            cols.push(ex.backoffSets[i].reps.toString());
          } else {
            cols.push('', '');
          }
        }
        cols.push(ex.lastBackoffRPE?.toString() || '');
        rows.push(cols.join(sep));
      });
    });

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironfisting_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Импорт с обработкой результата
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const { count, error } = importLogsFromCSV(text);
      if (error) {
        setImportMessage(`Ошибка: ${error}`);
        setTimeout(() => setImportMessage(null), 6000);
      } else {
        setImportMessage(`Импортировано тренировок: ${count}`);
        refreshLogs();
        setTimeout(() => setImportMessage(null), 5000);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Графики и таблица (без изменений)
  const uniqueExercises = Array.from(
    new Set(logs.flatMap(log => log.exercises.map(e => e.exerciseId)))
  );

  const chartData = logs
    .filter(log => log.exercises.some(e => e.exerciseId === selectedExercise))
    .map((log, index) => {
      const ex = log.exercises.find(e => e.exerciseId === selectedExercise)!;
      return {
        date: new Date(log.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        pdm: ex.pdm,
        tonnage: ex.tonnage || 0,
        kpsh: ex.kpsh || 0,
        cycle: log.macrocycleId ? `${log.macrocycleId} нед.${log.week}` : 'свободная',
        index,
      };
    });

  if (editingLog) {
    return (
      <div>
        <EditWorkout
          log={editingLog.log}
          index={editingLog.index}
          onCancel={() => setEditingLog(null)}
          onSaved={refreshLogs}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h2 onClick={onBackToMain} style={{ cursor: 'pointer', margin: 0 }}>IronFisting — История</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Кнопка импорта с прозрачным инпутом */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                pointerEvents: 'none',
              }}
            >
              📥 Импорт CSV
            </button>
            <input
              type="file"
              accept=".csv, text/csv"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>
          <button
            onClick={exportToCSV}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            📤 Экспорт CSV
          </button>
          <button
            onClick={handleClearAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Очистить всё
          </button>
        </div>
      </div>

      {importMessage && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '8px', borderRadius: '5px', margin: '10px 0' }}>
          {importMessage}
        </div>
      )}

      <div style={{ marginBottom: '20px', marginTop: '15px' }}>
        <label>Показать динамику для: </label>
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} style={{ padding: '5px' }}>
          {uniqueExercises.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <h3>Динамика ПДМ</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pdm" stroke="#8884d8" name="ПДМ (кг)" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Тоннаж и КПШ за тренировку</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="tonnage" stroke="#82ca9d" name="Тоннаж (кг)" />
          <Line yAxisId="right" type="monotone" dataKey="kpsh" stroke="#ff7300" name="КПШ" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Все записи</h3>
      <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Дата</th>
              <th style={thStyle}>День</th>
              <th style={thStyle}>Упражнение</th>
              <th style={thStyle}>ПДМ, кг</th>
              <th style={thStyle}>Тоннаж, кг</th>
              <th style={thStyle}>КПШ</th>
              <th style={thStyle}>Топ-сет</th>
              <th style={thStyle}>Бэкоф-сеты</th>
              <th style={thStyle}>RPE посл.</th>
              <th style={thStyle}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice().reverse().map((log, reversedIndex) => {
              const originalIndex = logs.length - 1 - reversedIndex;
              return log.exercises.map((ex, exIdx) => (
                <tr key={`${originalIndex}-${exIdx}`} style={{ borderBottom: '1px solid #ddd' }}>
                  {exIdx === 0 && (
                    <>
                      <td rowSpan={log.exercises.length} style={tdStyle}>{new Date(log.date).toLocaleDateString('ru-RU')}</td>
                      <td rowSpan={log.exercises.length} style={tdStyle}>{log.dayName}</td>
                    </>
                  )}
                  <td style={tdStyle}>{ex.category}</td>
                  <td style={tdStyle}>{ex.pdm}</td>
                  <td style={tdStyle}>{ex.tonnage || 0}</td>
                  <td style={tdStyle}>{ex.kpsh || 0}</td>
                  <td style={tdStyle}>{ex.topSet?.weight || '?'} кг x {ex.topSet?.reps || '?'} @ {ex.topSet?.rpe || '?'}</td>
                  <td style={tdStyle}>{ex.backoffSets?.map(s => `${s.weight}x${s.reps}`).join(', ') || '—'}</td>
                  <td style={tdStyle}>{ex.lastBackoffRPE || '—'}</td>
                  {exIdx === 0 && (
                    <td rowSpan={log.exercises.length} style={tdStyle}>
                      <button
                        onClick={() => setEditingLog({ log, index: originalIndex })}
                        style={{ padding: '4px 8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => handleDelete(originalIndex)}
                        style={{ padding: '4px 8px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Удалить
                      </button>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'left',
  borderBottom: '2px solid #ccc',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px',
  verticalAlign: 'top',
};

export default History;