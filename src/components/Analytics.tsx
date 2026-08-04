import { useEffect, useState } from 'react';
import { analyzeLogs } from '../utils/analytics';

interface AnalyticsProps {
  onBackToMain: () => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ onBackToMain }) => {
  const [advice, setAdvice] = useState<string[]>([]);

  useEffect(() => {
    // Динамически импортируем loadLogs, чтобы избежать проблем с циклическими зависимостями
    import('../utils/storage')
      .then(module => {
        const logs = module.loadLogs();
        setAdvice(analyzeLogs(logs));
      })
      .catch(() => {
        setAdvice(['Не удалось загрузить историю тренировок.']);
      });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2
  onClick={onBackToMain}
  style={{ cursor: 'pointer' }}
>
  IronFisting — Аналитика
</h2>
      {advice.length === 0 ? (
        <p>Пока недостаточно данных. Продолжай тренироваться.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {advice.map((item, i) => (
            <li key={i} style={{ background: '#f9f9f9', padding: '10px', marginBottom: '10px', borderLeft: '4px solid #4CAF50' }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Analytics;