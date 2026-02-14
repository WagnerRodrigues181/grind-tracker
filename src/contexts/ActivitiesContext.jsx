import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { onCustomActivitiesSnapshot } from '../services/activitiesService';
import { getToday } from '../utils/dateHelpers';

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

  // ============================================
  // ESTADOS CENTRALIZADOS
  // ============================================
  const [customActivities, setCustomActivities] = useState([]);
  const [loadingCustomActivities, setLoadingCustomActivities] = useState(true);

  const [dailyActivities, setDailyActivities] = useState([]);
  const [loadingDailyActivities, setLoadingDailyActivities] = useState(true);

  const [currentDate, setCurrentDate] = useState(getToday());
  const [totalMinutes, setTotalMinutes] = useState(0);

  // ============================================
  // LISTENER 1: TEMPLATES DE ATIVIDADES CUSTOMIZADAS
  // ============================================
  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomActivities([]);
      setLoadingCustomActivities(false);
      return;
    }

    console.log('🔥 ActivitiesContext: Iniciando listener de customActivities');
    setLoadingCustomActivities(true);

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      console.log('✅ ActivitiesContext: customActivities atualizadas:', activities.length);
      setCustomActivities(activities);
      setLoadingCustomActivities(false);
    });

    return () => {
      console.log('🧹 ActivitiesContext: Limpando listener de customActivities');
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // ============================================
  // LISTENER 2: ATIVIDADES DO DIA ATUAL
  // ============================================
  useEffect(() => {
    if (!currentUser?.uid) {
      setDailyActivities([]);
      setTotalMinutes(0);
      setLoadingDailyActivities(false);
      return;
    }

    console.log('🔥 ActivitiesContext: Iniciando listener de dailyActivities para', currentDate);
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

          // Só adiciona se a data bater (segurança extra)
          if (data.date === currentDate) {
            activitiesData.push({ id: docSnap.id, ...data });

            // Soma apenas atividades "timed" com minutes válidos
            if (data.type !== 'binary' && typeof data.minutes === 'number') {
              total += data.minutes;
            }
          }
        });

        // Ordena por data de criação (mais recente primeiro)
        activitiesData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });

        console.log('✅ ActivitiesContext: dailyActivities atualizadas:', {
          count: activitiesData.length,
          totalMinutes: total,
          date: currentDate,
        });

        setDailyActivities(activitiesData);
        setTotalMinutes(total);
        setLoadingDailyActivities(false);
      },
      (error) => {
        console.error('❌ ActivitiesContext: Erro no listener de dailyActivities:', error);
        setDailyActivities([]);
        setTotalMinutes(0);
        setLoadingDailyActivities(false);
      }
    );

    return () => {
      console.log('🧹 ActivitiesContext: Limpando listener de dailyActivities');
      unsubscribe();
    };
  }, [currentUser?.uid, currentDate]);

  // ============================================
  // FUNÇÕES UTILITÁRIAS
  // ============================================

  /**
   * Muda a data atual (navegar entre dias)
   */
  const changeDate = useCallback(
    (newDate) => {
      console.log('📅 ActivitiesContext: Mudando data de', currentDate, 'para', newDate);
      setCurrentDate(newDate);
    },
    [currentDate]
  );

  /**
   * Força reload das atividades do dia (fallback)
   */
  const refreshDailyActivities = useCallback(() => {
    console.log('🔄 ActivitiesContext: Refresh manual solicitado (listeners já cuidam disso)');
    // Na prática, os listeners onSnapshot já fazem isso automaticamente
    // Essa função existe apenas como fallback para compatibilidade
  }, []);

  /**
   * Adiciona uma nova atividade (helper rápido)
   */
  const addActivity = useCallback(
    async (activityData) => {
      if (!currentUser?.uid) {
        throw new Error('Usuário não autenticado');
      }

      console.log('➕ ActivitiesContext: Adicionando atividade:', activityData);

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

  // ============================================
  // VALOR DO CONTEXT
  // ============================================
  const value = {
    // Templates de atividades customizadas
    customActivities,
    loadingCustomActivities,

    // Atividades do dia atual
    dailyActivities,
    loadingDailyActivities,
    totalMinutes,

    // Data atual
    currentDate,
    changeDate,

    // Funções utilitárias
    refreshDailyActivities,
    addActivity,

    // Info do usuário (atalho)
    userId: currentUser?.uid,
  };

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}
