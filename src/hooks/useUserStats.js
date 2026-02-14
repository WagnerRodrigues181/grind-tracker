import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { timeToMinutes } from '../utils/dateHelpers';

/**
 * Hook para calcular estatísticas do usuário
 * Usado no ProfileCard
 */
export function useUserStats(userId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    async function calculateStats() {
      try {
        setLoading(true);
        const activitiesRef = collection(db, 'activities', userId, 'entries');
        const q = query(activitiesRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        console.log('📊 useUserStats: Docs encontrados:', snapshot.size);

        if (snapshot.empty) {
          setStats({
            totalHours: 0,
            totalMinutes: 0,
            topActivities: [],
            weekStreak: 0,
            totalDays: 0,
            avgHoursPerDay: 0,
            bestDay: null,
            avgPerActivity: [],
          });
          setLoading(false);
          return;
        }

        const activityMap = {};
        const dayMap = {};
        let totalMinutes = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const date = data.date;
          const activity = data.activity;
          const type = data.type || 'timed';

          let duration = 0;
          if (type === 'binary') {
            duration = 0; // Binary não conta em horas
          } else if (type === 'timed') {
            if (data.minutes != null && typeof data.minutes === 'number') {
              duration = data.minutes;
            } else if (data.duration) {
              duration = timeToMinutes(data.duration) || 0;
            }
          }

          totalMinutes += duration;

          if (!activityMap[activity]) activityMap[activity] = 0;
          activityMap[activity] += duration;

          if (!dayMap[date]) dayMap[date] = 0;
          dayMap[date] += duration;
        });

        // Top 3 atividades
        const topActivities = Object.entries(activityMap)
          .filter(([name, mins]) => mins > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, mins]) => ({
            name,
            hours: Math.floor(mins / 60),
            mins: mins % 60,
          }));

        // Streak (sequência de dias)
        let weekStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (dayMap[todayStr] > 0) {
          weekStreak = 1;
          let checkDate = new Date(today);
          for (let i = 1; i <= 365; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (dayMap[dateStr] > 0) {
              weekStreak++;
            } else {
              break;
            }
          }
        }

        // Melhor dia
        const bestDayEntry = Object.entries(dayMap)
          .filter(([date, mins]) => mins > 0)
          .sort((a, b) => b[1] - a[1])[0];
        const bestDay = bestDayEntry
          ? { date: bestDayEntry[0], hours: Math.floor(bestDayEntry[1] / 60) }
          : null;

        // Média por dia
        const totalDays = Object.keys(dayMap).filter((date) => dayMap[date] > 0).length;
        const avgHoursPerDay = totalDays > 0 ? (totalMinutes / 60 / totalDays).toFixed(1) : 0;

        // Média por atividade
        const avgPerActivity = Object.entries(activityMap)
          .filter(([name, mins]) => mins > 0)
          .map(([name, mins]) => {
            const totalHours = mins / 60;
            const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0.00';
            return { name, avgHours: parseFloat(avgHours) };
          });
        avgPerActivity.sort((a, b) => b.avgHours - a.avgHours);

        setStats({
          totalHours: Math.floor(totalMinutes / 60),
          totalMinutes,
          topActivities,
          weekStreak,
          totalDays,
          avgHoursPerDay: parseFloat(avgHoursPerDay),
          bestDay,
          avgPerActivity,
        });
      } catch (err) {
        console.error('❌ useUserStats: Erro ao calcular:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    calculateStats();
  }, [userId]);

  return { stats, loading, error };
}
