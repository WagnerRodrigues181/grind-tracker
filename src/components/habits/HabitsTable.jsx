import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getUserHabits,
  addHabit,
  removeHabit,
  getMonthTracking,
  toggleHabitDay,
  getHabitDuration,
} from '../../services/habitsService';
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
import { db } from '../../services/firebase';
import { onCustomActivitiesSnapshot } from '../../services/activitiesService';
import { useAuth } from '../../contexts/AuthContext';
import { timeToMinutes } from '../../utils/dateHelpers';

// ============================================
// 🔍 SISTEMA DE DEBUG COMPLETO
// ============================================
const DEBUG = true; // Mude para false para desativar
function debugLog(section, data) {
  if (!DEBUG) return;
  console.group(`🔍 DEBUG [${section}]`);
  console.log(data);
  console.trace('Stack trace:');
  console.groupEnd();
}
// ============================================

export default function HabitsTable({ onActivityAdded }) {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habits, setHabits] = useState([]);
  const [currentMonthTracking, setCurrentMonthTracking] = useState({});
  const [prevMonthTracking, setPrevMonthTracking] = useState({});
  const [nextMonthTracking, setNextMonthTracking] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDuration, setNewHabitDuration] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [error, setError] = useState('');
  const [showPredefinedSelect, setShowPredefinedSelect] = useState(false);
  const [availableActivities, setAvailableActivities] = useState([]);

  // === ESTADO VISUAL ===
  const [pulsingDays, setPulsingDays] = useState({});
  const [fireEmoji, setFireEmoji] = useState({});
  const [particles, setParticles] = useState([]);
  const [arrowPulse, setArrowPulse] = useState({ left: false, right: false });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // === DEBUG DO CALENDÁRIO GERADO (AGORA DENTRO DO ESCOPO) ===
  useEffect(() => {
    if (DEBUG) {
      const calendar = generateCalendar(year, month);
      debugLog('CALENDÁRIO GERADO', {
        year,
        month,
        monthName: getMonthName(month),
        weeks: calendar.weeks.map((week, idx) => ({
          weekNumber: idx + 1,
          days: week.map((d) => ({
            day: d.day,
            belongsTo: d.belongsTo,
          })),
        })),
      });
    }
  }, [year, month]);
  // ============================================

  // Carrega atividades do Firestore em tempo real
  useEffect(() => {
    if (!currentUser?.uid) {
      setAvailableActivities([]);
      return;
    }

    debugLog('INICIANDO LISTENER FIRESTORE', {
      userId: currentUser.uid,
      timestamp: new Date().toISOString(),
    });

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      debugLog('ATIVIDADES RECEBIDAS DO FIRESTORE', {
        count: activities.length,
        activities: activities.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          time: a.time,
          target: a.target,
        })),
      });
      setAvailableActivities(activities);
    });

    return () => {
      debugLog('DESMONTANDO LISTENER FIRESTORE', {
        userId: currentUser.uid,
      });
      unsubscribe();
    };
  }, [currentUser]);

  // Carrega dados do Firebase
  useEffect(() => {
    async function loadData() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { prevYear, prevMonth, nextYear, nextMonth } = getAdjacentMonths(year, month);

        const [habitsData, currentTracking, prevTracking, nextTracking] = await Promise.all([
          getUserHabits(currentUser.uid),
          getMonthTracking(currentUser.uid, year, month),
          getMonthTracking(currentUser.uid, prevYear, prevMonth),
          getMonthTracking(currentUser.uid, nextYear, nextMonth),
        ]);

        setHabits(habitsData);
        setCurrentMonthTracking(currentTracking);
        setPrevMonthTracking(prevTracking);
        setNextMonthTracking(nextTracking);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser, year, month]);

  function goToPreviousMonth() {
    setArrowPulse({ ...arrowPulse, left: true });
    setTimeout(() => setArrowPulse({ ...arrowPulse, left: false }), 300);
    setCurrentDate(new Date(year, month - 2, 1));
  }

  function goToNextMonth() {
    setArrowPulse({ ...arrowPulse, right: true });
    setTimeout(() => setArrowPulse({ ...arrowPulse, right: false }), 300);
    setCurrentDate(new Date(year, month, 1));
  }

  async function handleAddHabitFromPredefined(activity) {
    try {
      debugLog('ADICIONANDO HÁBITO PRÉ-DEFINIDO', {
        activityId: activity.id,
        name: activity.name,
        time: activity.time,
        type: activity.type,
      });

      await addHabit(currentUser.uid, activity.name, activity.time || '00:30');
      setShowPredefinedSelect(false);
      setShowAddModal(false);
      setError('');

      const habitsData = await getUserHabits(currentUser.uid);
      setHabits(habitsData);

      debugLog('HÁBITO ADICIONADO COM SUCESSO', {
        habitName: activity.name,
        totalHabits: habitsData.length,
      });
    } catch (error) {
      console.error('Erro ao adicionar hábito:', error);
      setError(error.message);
    }
  }

  async function handleAddHabit() {
    if (!newHabitName.trim()) {
      setError('Digite um nome para o hábito');
      return;
    }

    if (!newHabitDuration.trim()) {
      setError('Digite uma duração padrão (ex: 01:30)');
      return;
    }

    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (!timeRegex.test(newHabitDuration)) {
      setError('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    try {
      await addHabit(currentUser.uid, newHabitName.trim(), newHabitDuration.trim());

      setNewHabitName('');
      setNewHabitDuration('');
      setNewHabitTarget('');
      setShowAddModal(false);
      setShowPredefinedSelect(false);
      setError('');

      const habitsData = await getUserHabits(currentUser.uid);
      setHabits(habitsData);
    } catch (error) {
      setError(error.message);
    }
  }

  async function handleRemoveHabit(habitName) {
    if (!confirm(`Tem certeza que deseja remover "${habitName}"?`)) return;

    try {
      await removeHabit(currentUser.uid, habitName);
      const habitsData = await getUserHabits(currentUser.uid);
      setHabits(habitsData);
    } catch (error) {
      console.error('Erro ao remover hábito:', error);
    }
  }

  // ============================================
  // Na função handleToggleDay - SUBSTITUA COMPLETAMENTE
  // ============================================
  async function handleToggleDay(habitName, cellData) {
    debugLog('handleToggleDay - INÍCIO', {
      habitName,
      cellData,
      currentYear: year,
      currentMonth: month,
      currentDateState: currentDate,
    });
    if (!habitName || !currentUser?.uid) {
      console.warn('⚠️ Hábito ou usuário inválido');
      return;
    }
    try {
      // Determina ano, mês e dia corretos baseado em belongsTo
      let targetYear, targetMonth, targetDay;

      if (cellData.belongsTo === 'current') {
        targetYear = year;
        targetMonth = month;
        targetDay = cellData.day;
      } else if (cellData.belongsTo === 'prev') {
        const { prevYear, prevMonth } = getAdjacentMonths(year, month);
        targetYear = prevYear;
        targetMonth = prevMonth;
        targetDay = cellData.day;
      } else if (cellData.belongsTo === 'next') {
        const { nextYear, nextMonth } = getAdjacentMonths(year, month);
        targetYear = nextYear;
        targetMonth = nextMonth;
        targetDay = cellData.day;
      }
      debugLog('handleToggleDay - DATA CALCULADA', {
        belongsTo: cellData.belongsTo,
        targetYear,
        targetMonth,
        targetDay,
        dateString: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`,
      });
      const dayKey = String(targetDay).padStart(2, '0');
      const currentValue = currentMonthTracking[habitName]?.[dayKey] === true;
      const pulseKey = `${habitName}-${targetDay}`;
      debugLog('handleToggleDay - ESTADO ATUAL', {
        dayKey,
        currentValue,
        willBeChecked: !currentValue,
        pulseKey,
      });
      setPulsingDays((prev) => ({ ...prev, [pulseKey]: true }));
      setTimeout(
        () =>
          setPulsingDays((prev) => {
            const newState = { ...prev };
            delete newState[pulseKey];
            return newState;
          }),
        600
      );
      if (!currentValue) {
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
      setCurrentMonthTracking((prev) => ({
        ...prev,
        [habitName]: {
          ...prev[habitName],
          [dayKey]: !currentValue,
        },
      }));
      debugLog('handleToggleDay - ANTES toggleHabitDay', {
        userId: currentUser.uid,
        targetYear,
        targetMonth,
        targetDay,
        habitName,
      });
      await toggleHabitDay(currentUser.uid, targetYear, targetMonth, targetDay, habitName);
      debugLog('handleToggleDay - DEPOIS toggleHabitDay', {
        success: true,
        willRegisterActivity: !currentValue,
      });
      if (!currentValue) {
        debugLog('handleToggleDay - REGISTRANDO ATIVIDADE', {
          habitName,
          targetYear,
          targetMonth,
          targetDay,
        });

        await registerHabitAsActivity(habitName, targetYear, targetMonth, targetDay);
        onActivityAdded?.(habitName);

        debugLog('handleToggleDay - ATIVIDADE REGISTRADA', { success: true });
      } else {
        debugLog('handleToggleDay - REMOVENDO ATIVIDADE', {
          habitName,
          targetYear,
          targetMonth,
          targetDay,
        });

        await removeHabitActivity(habitName, targetYear, targetMonth, targetDay);
        onActivityAdded?.();

        debugLog('handleToggleDay - ATIVIDADE REMOVIDA', { success: true });
      }
    } catch (error) {
      console.error('❌ Erro em handleToggleDay:', error);
      debugLog('handleToggleDay - ERRO', {
        error: error.message,
        stack: error.stack,
      });

      const tracking = await getMonthTracking(currentUser.uid, year, month);
      setCurrentMonthTracking(tracking);
    }
  }

  // ============================================
  // Na função registerHabitAsActivity - SUBSTITUA COMPLETAMENTE
  // ============================================
  async function registerHabitAsActivity(habitName, year, month, day) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    debugLog('registerHabitAsActivity - INÍCIO', {
      habitName,
      year,
      month,
      day,
      dateStr,
      userId: currentUser.uid,
    });
    try {
      const duration = await getHabitDuration(currentUser.uid, habitName);

      debugLog('registerHabitAsActivity - DURAÇÃO OBTIDA', {
        duration,
        habitName,
      });

      if (!duration) {
        console.warn('⚠️ Duração não encontrada para o hábito:', habitName);
        return;
      }
      const minutes = timeToMinutes(duration);

      // Busca a atividade correspondente no Firestore
      const matchingActivity = availableActivities.find((a) => a.name === habitName);
      const targetMinutes = matchingActivity?.target
        ? timeToMinutes(matchingActivity.target)
        : null;

      const activityData = {
        activity: habitName,
        minutes,
        targetMinutes,
        date: dateStr,
        createdAt: serverTimestamp(),
        userEmail: currentUser.email,
        userId: currentUser.uid,
      };
      debugLog('registerHabitAsActivity - DADOS DA ATIVIDADE', {
        activityData,
        collectionPath: `activities/${currentUser.uid}/entries`,
        matchingActivity: matchingActivity
          ? {
              id: matchingActivity.id,
              name: matchingActivity.name,
              target: matchingActivity.target,
            }
          : null,
      });
      const docRef = await addDoc(
        collection(db, 'activities', currentUser.uid, 'entries'),
        activityData
      );
      debugLog('registerHabitAsActivity - SUCESSO', {
        docId: docRef.id,
        path: docRef.path,
        dateRegistered: dateStr,
      });
      console.log('✅ Atividade registrada com sucesso!', {
        habit: habitName,
        date: dateStr,
        docId: docRef.id,
      });
    } catch (error) {
      console.error('❌ Erro ao registrar atividade:', error);
      debugLog('registerHabitAsActivity - ERRO', {
        error: error.message,
        stack: error.stack,
        habitName,
        dateStr,
      });
      throw error;
    }
  }

  // ============================================
  // Na função removeHabitActivity - SUBSTITUA COMPLETAMENTE
  // ============================================
  async function removeHabitActivity(habitName, year, month, day) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    debugLog('removeHabitActivity - INÍCIO', {
      habitName,
      year,
      month,
      day,
      dateStr,
      userId: currentUser.uid,
    });
    try {
      const q = query(
        collection(db, 'activities', currentUser.uid, 'entries'),
        where('activity', '==', habitName),
        where('date', '==', dateStr)
      );
      debugLog('removeHabitActivity - QUERY', {
        collectionPath: `activities/${currentUser.uid}/entries`,
        whereActivity: habitName,
        whereDate: dateStr,
      });
      const snapshot = await getDocs(q);

      debugLog('removeHabitActivity - DOCUMENTOS ENCONTRADOS', {
        count: snapshot.docs.length,
        docs: snapshot.docs.map((d) => ({
          id: d.id,
          data: d.data(),
        })),
      });
      const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, 'activities', currentUser.uid, 'entries', docSnap.id))
      );

      await Promise.all(deletePromises);
      debugLog('removeHabitActivity - SUCESSO', {
        deletedCount: snapshot.docs.length,
        dateStr,
      });
      console.log('✅ Atividade(s) removida(s) com sucesso!', {
        habit: habitName,
        date: dateStr,
        count: snapshot.docs.length,
      });
      onActivityAdded?.();
    } catch (error) {
      console.error('❌ Erro ao remover atividade:', error);
      debugLog('removeHabitActivity - ERRO', {
        error: error.message,
        stack: error.stack,
        habitName,
        dateStr,
      });
      throw error;
    }
  }

  function isChecked(habitName, cellData) {
    const dayKey = String(cellData.day).padStart(2, '0');
    if (cellData.belongsTo === 'current') return currentMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'prev') return prevMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'next') return nextMonthTracking[habitName]?.[dayKey] === true;
    return false;
  }

  function getDayCompletion(cellData) {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h) => isChecked(h, cellData)).length;
    return Math.round((completed / habits.length) * 100);
  }

  const calendar = generateCalendar(year, month);

  if (loading) {
    return (
      <div className="p-8 bg-[#1e1e1e] rounded-xl">
        <div className="text-center text-[#8b8b8b]">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        
        @keyframes pulse-ritual {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes particle-fly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        
        @keyframes fire-appear {
          0% { transform: scale(0) translateY(10px); opacity: 0; }
          50% { transform: scale(1.2) translateY(-5px); opacity: 1; }
          100% { transform: scale(0) translateY(-20px); opacity: 0; }
        }
        
        @keyframes rotate-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .pulse-ritual { animation: pulse-ritual 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .particle-effect { 
          position: absolute; width: 6px; height: 6px; background: #8b8b8b; 
          border-radius: 50%; pointer-events: none; animation: particle-fly 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; 
          box-shadow: 0 0 8px #8b8b8b; 
        }
        .fire-emoji { position: absolute; font-size: 20px; animation: fire-appear 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; pointer-events: none; z-index: 50; }
        .rotating-ring { animation: rotate-ring 8s linear infinite; }
        .diagonal-pattern { background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139,139,139,0.03) 10px, rgba(139,139,139,0.03) 20px); }
        .habit-row:hover .habit-name { text-shadow: 0 0 12px rgba(139,139,139,0.8); }
        .trash-hover:hover { transform: rotate(15deg) scale(1.1); filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
        .plus-rotate:hover { transform: rotate(90deg); }
        .arrow-pulse { animation: pulse-ritual 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        .scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #8b8b8b #1a1a1a;
        }
        .scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 3px;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: #8b8b8b;
          border-radius: 3px;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: #a0a0a0;
        }

        .activity-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .activity-card:hover {
          background-color: #2a2a2a !important;
          border-color: #8b8b8b !important;
          box-shadow: 0 4px 16px rgba(139,139,139,0.2);
        }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter relative">
        <div className="p-6 border-b-2 border-[#8b8b8b]/30 bg-gradient-to-br from-[#1e1e1e] to-[#252525] diagonal-pattern relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8b8b8b]/5 to-transparent"></div>
          <div className="flex items-center justify-between relative z-10">
            <h2
              className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
              style={{
                textShadow: '0 0 20px rgba(139,139,139,0.5), 0 0 40px rgba(139,139,139,0.3)',
              }}
            >
              Hábitos
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className={`p-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/20 hover:border-[#8b8b8b]/50 hover:shadow-lg hover:shadow-[#8b8b8b]/20 ${arrowPulse.left ? 'arrow-pulse' : ''}`}
              >
                <ChevronLeft className="w-5 h-5 text-[#8b8b8b]" />
              </button>
              <span className="text-sm font-semibold text-[#8b8b8b] min-w-[140px] text-center px-4 py-2 bg-[#252525]/50 rounded-lg border border-[#8b8b8b]/20">
                {getMonthName(month)} {year}
              </span>
              <button
                onClick={goToNextMonth}
                className={`p-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/20 hover:border-[#8b8b8b]/50 hover:shadow-lg hover:shadow-[#8b8b8b]/20 ${arrowPulse.right ? 'arrow-pulse' : ''}`}
              >
                <ChevronRight className="w-5 h-5 text-[#8b8b8b]" />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="ml-2 p-2 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#8b8b8b]/40"
                title="Adicionar hábito"
              >
                <Plus className="w-5 h-5 plus-rotate" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#8b8b8b]/30 scrollbar-track-transparent">
          <div className="min-w-full max-w-[1400px] mx-auto">
            <table className="w-full min-w-[1000px] table-fixed border-collapse">
              <thead>
                <tr className="bg-[#252525]">
                  <th className="sticky left-0 z-20 bg-[#252525] px-3 py-2 text-left font-bold text-[#8b8b8b] border-r border-[#8b8b8b]/30 w-24">
                    Hábitos
                  </th>
                  {calendar.weeks.map((_, idx) => (
                    <th
                      key={idx}
                      colSpan={7}
                      className="px-2 py-2 text-center font-semibold text-[#8b8b8b] border-l border-[#8b8b8b]/30"
                    >
                      {year}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-[#252525] border-l border-[#8b8b8b]/30 w-8"></th>
                </tr>
                <tr className="bg-[#252525]">
                  <th className="sticky left-0 z-20 bg-[#252525] border-r border-[#8b8b8b]/30"></th>
                  {calendar.weeks.map((_, idx) => (
                    <th
                      key={idx}
                      colSpan={7}
                      className="px-2 py-2 text-center text-[10px] font-medium text-[#8b8b8b]/70 border-l border-[#8b8b8b]/30"
                    >
                      Semana {idx + 1}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-[#252525] border-l border-[#8b8b8b]/30"></th>
                </tr>
                <tr className="bg-[#1e1e1e] border-b-2 border-[#8b8b8b]/40">
                  <th className="sticky left-0 z-20 bg-[#1e1e1e] border-r border-[#8b8b8b]/30"></th>
                  {calendar.weeks.map((week, weekIdx) =>
                    week.map((_, dayIdx) => (
                      <th
                        key={`${weekIdx}-${dayIdx}`}
                        className={`px-1 py-2 text-center text-[10px] font-medium text-[#8b8b8b]/80 ${dayIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
                      >
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayIdx]}
                      </th>
                    ))
                  )}
                  <th className="sticky right-0 z-20 bg-[#1e1e1e] border-l border-[#8b8b8b]/30"></th>
                </tr>
              </thead>
              <tbody>
                {habits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={calendar.weeks.length * 7 + 2}
                      className="px-4 py-12 text-center text-[#8b8b8b]/50 text-sm"
                    >
                      Nenhum hábito cadastrado
                    </td>
                  </tr>
                ) : (
                  habits.map((habit) => (
                    <tr
                      key={habit}
                      className="border-b border-[#8b8b8b]/20 hover:bg-[#252525]/40 transition-all duration-200 habit-row"
                    >
                      <td className="sticky left-0 z-10 bg-[#1a1a1a] hover:bg-[#252525]/40 px-3 py-2 text-[11px] font-semibold text-[#8b8b8b] border-r border-[#8b8b8b]/30 truncate habit-name transition-all duration-200">
                        {habit}
                      </td>
                      {calendar.weeks.map((week, weekIdx) =>
                        week.map((cellData, dayIdx) => {
                          const checked = isChecked(habit, cellData);
                          const isCurrent = cellData.belongsTo === 'current';
                          const pulseKey = `${habit}-${cellData.day}`;
                          const isPulsing = pulsingDays[pulseKey];

                          return (
                            <td
                              key={`${weekIdx}-${dayIdx}`}
                              className={`px-1 py-2 text-center relative ${dayIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
                            >
                              {particles
                                .filter((p) => p.habitName === habit && p.day === cellData.day)
                                .map((p) => (
                                  <div
                                    key={p.id}
                                    className="particle-effect"
                                    style={{
                                      '--tx': `${Math.cos((p.angle * Math.PI) / 180) * 30}px`,
                                      '--ty': `${Math.sin((p.angle * Math.PI) / 180) * 30}px`,
                                    }}
                                  />
                                ))}
                              <button
                                onClick={
                                  isCurrent ? () => handleToggleDay(habit, cellData) : undefined
                                }
                                disabled={!isCurrent}
                                className={`w-5 h-5 rounded-full transition-all duration-200 relative ${isPulsing ? 'pulse-ritual' : ''} ${
                                  checked
                                    ? isCurrent
                                      ? 'bg-gradient-to-br from-[#00C853] to-[#00E676] border-2 border-[#00E676] shadow-lg shadow-green-500/30'
                                      : 'bg-gradient-to-br from-[#00993d] to-[#00b359] border-2 border-[#00b359]'
                                    : isCurrent
                                      ? 'bg-transparent border-2 border-[#8b8b8b]/30 hover:border-[#8b8b8b] hover:bg-[#8b8b8b]/10 hover:scale-110'
                                      : 'bg-[#1a1a1a] border-2 border-[#1a1a1a]'
                                } ${!isCurrent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              />
                            </td>
                          );
                        })
                      )}
                      <td className="sticky right-0 z-10 bg-[#1a1a1a] hover:bg-[#252525]/40 border-l border-[#8b8b8b]/30">
                        <button
                          onClick={() => handleRemoveHabit(habit)}
                          className="p-1 text-red-400 hover:text-red-300 rounded transition-all duration-200 trash-hover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {habits.length > 0 && (
                  <tr className="bg-[#252525] border-t-2 border-[#8b8b8b]/40">
                    <td className="sticky left-0 z-10 bg-[#252525] px-3 py-2 text-[11px] font-bold text-[#8b8b8b] border-r border-[#8b8b8b]/30">
                      Total %
                    </td>
                    {calendar.weeks.map((week, weekIdx) =>
                      week.map((cellData, dayIdx) => {
                        const completion = getDayCompletion(cellData);
                        const colorClass =
                          completion >= 80
                            ? 'bg-green-500'
                            : completion >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500';
                        const fireKey = `fire-${cellData.day}`;
                        const showFire = fireEmoji[fireKey] && cellData.belongsTo === 'current';

                        return (
                          <td
                            key={`${weekIdx}-${dayIdx}`}
                            className={`px-1 py-2 text-center relative ${dayIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
                          >
                            {showFire && <div className="fire-emoji">🔥</div>}
                            <div
                              className={`w-6 h-6 mx-auto flex items-center justify-center text-[9px] font-bold text-white ${colorClass} rounded-md shadow-lg relative overflow-hidden`}
                            >
                              {completion >= 80 && (
                                <div className="absolute inset-0 border-2 border-[#8b8b8b]/40 rounded-md rotating-ring"></div>
                              )}
                              <span className="relative z-10">{completion}%</span>
                            </div>
                          </td>
                        );
                      })
                    )}
                    <td className="sticky right-0 z-10 bg-[#252525] border-l border-[#8b8b8b]/30"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL COM HOVER CORRIGIDO E SCROLL MELHORADO */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 relative"
              >
                <h3
                  className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel"
                  style={{ textShadow: '0 0 15px rgba(139,139,139,0.4)' }}
                >
                  Adicionar Novo Hábito
                </h3>

                {error && (
                  <div className="mb-4 p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {!showPredefinedSelect ? (
                  <>
                    <button
                      onClick={() => setShowPredefinedSelect(true)}
                      className="w-full mb-6 p-4 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
                    >
                      Escolher de Atividades Pré-definidas
                    </button>
                    <div className="relative mb-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-[#8b8b8b]/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 py-1 bg-[#252525] text-[#8b8b8b]/70 rounded-full border border-[#8b8b8b]/20">
                          ou
                        </span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="Nome do hábito"
                      className="w-full mb-4 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                    />
                    <input
                      type="text"
                      value={newHabitDuration}
                      onChange={(e) => setNewHabitDuration(e.target.value)}
                      placeholder="Duração padrão (ex: 01:30)"
                      className="w-full mb-4 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                      maxLength={5}
                    />
                    <input
                      type="text"
                      value={newHabitTarget}
                      onChange={(e) => setNewHabitTarget(e.target.value)}
                      placeholder="Meta diária (ex: 04:00) - opcional"
                      className="w-full mb-6 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                      maxLength={5}
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setNewHabitName('');
                          setNewHabitDuration('');
                          setNewHabitTarget('');
                          setError('');
                        }}
                        className="flex-1 p-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddHabit}
                        className="flex-1 p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40"
                      >
                        Adicionar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowPredefinedSelect(false)}
                      className="mb-4 text-sm text-[#8b8b8b]/70 hover:text-[#8b8b8b] transition-colors flex items-center gap-2"
                    >
                      ← Voltar
                    </button>

                    <div
                      className="max-h-80 overflow-y-auto mb-6 space-y-2 scroll-container pr-3"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      {availableActivities.length === 0 ? (
                        <p className="text-sm text-[#8b8b8b]/60 text-center py-8">
                          Nenhuma atividade pré-definida cadastrada. Use o botão "Gerenciar" no
                          formulário de atividades para adicionar.
                        </p>
                      ) : (
                        availableActivities.map((activity) => (
                          <button
                            key={activity.id}
                            onClick={() => handleAddHabitFromPredefined(activity)}
                            className="activity-card w-full p-3 bg-[#1a1a1a] rounded-xl text-left border border-[#8b8b8b]/30 flex flex-col group"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-[#8b8b8b] group-hover:text-[#a0a0a0] transition-colors">
                                {activity.name}
                              </span>
                              {activity.type === 'binary' ? (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                  ✓ Check
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                                  ⏱ Tempo
                                </span>
                              )}
                            </div>
                            {activity.type !== 'binary' && (
                              <div className="text-xs text-[#8b8b8b]/60 group-hover:text-[#8b8b8b]/80 transition-colors">
                                Duração: {activity.time || '00:30'}
                                {activity.target && ` → Meta: ${activity.target}`}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setShowPredefinedSelect(false);
                        setError('');
                      }}
                      className="w-full p-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// FUNÇÕES AUXILIARES
function getMonthName(month) {
  const names = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return names[month - 1];
}

function getAdjacentMonths(year, month) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { prevYear, prevMonth, nextYear, nextMonth };
}

function generateCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const endDayOfWeek = lastDay.getDay();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const totalCells = startDayOfWeek + daysInMonth + (6 - endDayOfWeek);
  const numWeeks = Math.ceil(totalCells / 7);
  const weeks = [];
  let dayCounter = 1 - startDayOfWeek;

  for (let w = 0; w < numWeeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (dayCounter < 1) {
        // Dias do mês anterior
        week.push({
          day: daysInPrevMonth + dayCounter,
          belongsTo: 'prev',
        });
      } else if (dayCounter <= daysInMonth) {
        // Dias do mês atual
        week.push({
          day: dayCounter,
          belongsTo: 'current',
        });
      } else {
        // Dias do próximo mês
        week.push({
          day: dayCounter - daysInMonth,
          belongsTo: 'next',
        });
      }
      dayCounter++;
    }
    weeks.push(week);
  }

  // ===== DEBUG: Vamos ver o que está sendo gerado =====
  if (DEBUG) {
    debugLog('generateCalendar - RESULTADO', {
      year,
      month,
      monthName: getMonthName(month),
      daysInMonth,
      firstDayWeekday: startDayOfWeek,
      lastDayWeekday: endDayOfWeek,
      totalWeeks: weeks.length,
      firstWeek: weeks[0],
      lastWeek: weeks[weeks.length - 1],
      allDays: weeks
        .flat()
        .map((d) => `${d.day}(${d.belongsTo})`)
        .join(', '),
    });
  }

  return { weeks };
}
