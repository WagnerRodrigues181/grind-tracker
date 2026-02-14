import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Hook para agregação de dados semanais
 * Usado no WeeklyAreaChart
 */
export function useWeeklyData(userId, weekOffset = 0) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState({ start: '', end: '' });

  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setChartData([]);
      setLoading(false);
      return;
    }

    // Limpar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Calcular semana
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7);

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);

    setWeekDates({
      start: formatDateForDisplay(weekStart),
      end: formatDateForDisplay(weekEnd),
    });

    const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const emptyData = daysOfWeek.map((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return { day, date: formatDateForQuery(date), minutes: 0, hours: 0 };
    });

    setLoading(true);

    const startDate = formatDateForQuery(weekStart);
    const endDate = formatDateForQuery(weekEnd);

    const q = query(
      collection(db, 'activities', userId, 'entries'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newData = emptyData.map((day) => ({ ...day, minutes: 0, hours: 0 }));
        const dayMap = new Map();

        snapshot.forEach((doc) => {
          const act = doc.data();

          // Ignora binary e valida minutes
          if (act.type === 'binary') return;

          if (typeof act.minutes === 'number' && !isNaN(act.minutes)) {
            const currentTotal = dayMap.get(act.date) || 0;
            dayMap.set(act.date, currentTotal + act.minutes);
          }
        });

        newData.forEach((day) => {
          const mins = dayMap.get(day.date) || 0;
          day.minutes = mins;
          day.hours = Number((mins / 60).toFixed(2));
        });

        setChartData(newData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ useWeeklyData: Erro no listener:', error);
        setChartData(emptyData);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, weekOffset]);

  return { chartData, loading, weekDates };
}

// Helpers
function formatDateForQuery(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateForDisplay(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}
