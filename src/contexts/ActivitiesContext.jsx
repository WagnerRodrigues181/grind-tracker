import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { onCustomActivitiesSnapshot } from '../services/activitiesService';
import { getToday } from '../utils/formatters/dateFormatters';

const ActivitiesContext = createContext(null);

export function useActivities() {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities deve ser usado dentro de ActivitiesProvider');
  }
  return context;
}

export function ActivitiesProvider({ children }) {
  const { currentUser } = useAuth();

  const [customActivities, setCustomActivities] = useState([]);
  const [loadingCustomActivities, setLoadingCustomActivities] = useState(true);

  const [dailyActivities, setDailyActivities] = useState([]);
  const [loadingDailyActivities, setLoadingDailyActivities] = useState(true);

  const [currentDate, setCurrentDate] = useState(getToday());
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Listener: Custom Activities
  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomActivities([]);
      setLoadingCustomActivities(false);
      return;
    }

    setLoadingCustomActivities(true);

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      setCustomActivities(activities);
      setLoadingCustomActivities(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listener: Daily Activities
  useEffect(() => {
    if (!currentUser?.uid) {
      setDailyActivities([]);
      setTotalMinutes(0);
      setLoadingDailyActivities(false);
      return;
    }

    setLoadingDailyActivities(true);

    const q = query(
      collection(db, 'activities', currentUser.uid, 'entries'),
      where('date', '==', currentDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = [];
        let total = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          if (data.date === currentDate) {
            activitiesData.push({ id: docSnap.id, ...data });

            if (data.type !== 'binary' && typeof data.minutes === 'number') {
              total += data.minutes;
            }
          }
        });

        activitiesData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });

        setDailyActivities(activitiesData);
        setTotalMinutes(total);
        setLoadingDailyActivities(false);
      },
      (error) => {
        console.error('Erro no listener de dailyActivities:', error);
        setDailyActivities([]);
        setTotalMinutes(0);
        setLoadingDailyActivities(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, currentDate]);

  const changeDate = useCallback((newDate) => {
    setCurrentDate(newDate);
  }, []);

  const refreshDailyActivities = useCallback(() => {
    // Listeners já cuidam disso automaticamente
  }, []);

  const addActivity = useCallback(
    async (activityData) => {
      if (!currentUser?.uid) {
        throw new Error('Usuário não autenticado');
      }

      return await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        date: currentDate,
        createdAt: serverTimestamp(),
        ...activityData,
      });
    },
    [currentUser, currentDate]
  );

  const value = {
    customActivities,
    loadingCustomActivities,
    dailyActivities,
    loadingDailyActivities,
    totalMinutes,
    currentDate,
    changeDate,
    refreshDailyActivities,
    addActivity,
    userId: currentUser?.uid,
  };

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}
