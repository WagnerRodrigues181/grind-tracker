import { useState, useCallback } from 'react';
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../contexts/ActivitiesContext';
import { toggleHabitDay, getHabitDuration } from '../services/habitsService';
import { timeToMinutes } from '../utils/dateHelpers';

/**
 * Hook para gerenciar tracking de hábitos
 * Responsável por check/uncheck, integração com activities e efeitos visuais
 */
export function useHabitsTracking(habits, currentMonthTracking, year, month, onTrackingUpdate) {
  const { currentUser } = useAuth();
  const { customActivities } = useActivities();

  // Estados para efeitos visuais
  const [pulsingDays, setPulsingDays] = useState({});
  const [fireEmoji, setFireEmoji] = useState({});
  const [particles, setParticles] = useState([]);

  /**
   * Toggle um hábito em um dia específico
   */
  const handleToggleDay = useCallback(
    async (habitName, cellData) => {
      if (!habitName || !currentUser?.uid) return;

      try {
        let targetYear, targetMonth, targetDay;

        // Determina o ano/mês/dia correto baseado em belongsTo
        if (cellData.belongsTo === 'current') {
          targetYear = year;
          targetMonth = month;
          targetDay = cellData.day;
        } else if (cellData.belongsTo === 'prev') {
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          targetYear = prevYear;
          targetMonth = prevMonth;
          targetDay = cellData.day;
        } else if (cellData.belongsTo === 'next') {
          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          targetYear = nextYear;
          targetMonth = nextMonth;
          targetDay = cellData.day;
        }

        const dayKey = String(targetDay).padStart(2, '0');
        const currentValue = currentMonthTracking[habitName]?.[dayKey] === true;
        const pulseKey = `${habitName}-${targetDay}`;

        // Efeito de pulse
        setPulsingDays((prev) => ({ ...prev, [pulseKey]: true }));
        setTimeout(() => {
          setPulsingDays((prev) => {
            const newState = { ...prev };
            delete newState[pulseKey];
            return newState;
          });
        }, 600);

        // Se está marcando (não desmarcando)
        if (!currentValue) {
          // Efeito de partículas
          const newParticles = Array.from({ length: 4 }, (_, i) => ({
            id: `${pulseKey}-${i}-${Date.now()}`,
            angle: i * 90 + 45,
            habitName,
            day: targetDay,
          }));
          setParticles((prev) => [...prev, ...newParticles]);
          setTimeout(() => {
            setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
          }, 800);

          // Verifica se completou todos os hábitos do dia (🔥)
          const totalHabits = habits.length;
          const completedAfterToggle = habits.filter((h) => {
            if (h === habitName) return true;
            return currentMonthTracking[h]?.[dayKey] === true;
          }).length;

          if (completedAfterToggle === totalHabits) {
            const fireKey = `fire-${targetDay}`;
            setFireEmoji((prev) => ({ ...prev, [fireKey]: true }));
            setTimeout(() => {
              setFireEmoji((prev) => {
                const newState = { ...prev };
                delete newState[fireKey];
                return newState;
              });
            }, 1500);
          }
        }

        // Atualiza Firestore
        await toggleHabitDay(currentUser.uid, targetYear, targetMonth, targetDay, habitName);

        // Registra/remove como atividade
        if (!currentValue) {
          await registerHabitAsActivity(habitName, targetYear, targetMonth, targetDay);
        } else {
          await removeHabitActivity(habitName, targetYear, targetMonth, targetDay);
        }

        // Callback para atualizar UI pai
        if (onTrackingUpdate) onTrackingUpdate();
      } catch (error) {
        console.error('❌ Erro em handleToggleDay:', error);
      }
    },
    [currentUser, habits, currentMonthTracking, year, month, customActivities, onTrackingUpdate]
  );

  /**
   * Registra hábito como atividade no Firestore
   */
  async function registerHabitAsActivity(habitName, year, month, day) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      const matchingActivity = customActivities.find((a) => a.name === habitName);

      // Se for binary
      if (matchingActivity?.type === 'binary') {
        await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
          activity: habitName,
          type: 'binary',
          completed: true,
          date: dateStr,
          createdAt: serverTimestamp(),
          userId: currentUser.uid,
          userEmail: currentUser.email,
        });
        return;
      }

      // Se for timed
      const duration = await getHabitDuration(currentUser.uid, habitName);
      if (!duration) return;

      const minutes = timeToMinutes(duration);
      const targetMinutes = matchingActivity?.target
        ? timeToMinutes(matchingActivity.target)
        : null;

      await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
        activity: habitName,
        type: 'timed',
        minutes,
        targetMinutes,
        date: dateStr,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
      });
    } catch (error) {
      console.error('Erro ao registrar atividade do hábito:', error);
    }
  }

  /**
   * Remove atividade do hábito quando desmarcado
   */
  async function removeHabitActivity(habitName, year, month, day) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      const q = query(
        collection(db, 'activities', currentUser.uid, 'entries'),
        where('activity', '==', habitName),
        where('date', '==', dateStr)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, 'activities', currentUser.uid, 'entries', docSnap.id))
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('❌ Erro ao remover atividade:', error);
      throw error;
    }
  }

  return {
    handleToggleDay,
    pulsingDays,
    fireEmoji,
    particles,
  };
}
