import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeHabit, getMonthTracking } from '../../services/habitsService';
import { getUserHabitsOrdered, updateHabitsOrder } from '../../services/habitsService';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext';
import { useHabitsTracking } from '../../hooks/useHabitsTracking';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Componentes filhos
import HabitRow from './HabitRow';
import HabitStats from './HabitStats';
import AddHabitModal from './AddHabitModal';

// Drag and Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

/**
 * Tabela de hábitos mensal com drag-and-drop
 */
export default function HabitsTable() {
  const { currentUser } = useAuth();
  const { customActivities, loadingCustomActivities } = useActivities();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [habits, setHabits] = useState([]);
  const [currentMonthTracking, setCurrentMonthTracking] = useState({});
  const [prevMonthTracking, setPrevMonthTracking] = useState({});
  const [nextMonthTracking, setNextMonthTracking] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [arrowPulse, setArrowPulse] = useState({ left: false, right: false });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Hook de tracking com efeitos visuais
  const { handleToggleDay, pulsingDays, fireEmoji, particles } = useHabitsTracking(
    habits,
    currentMonthTracking,
    year,
    month,
    () => {} // callback vazio pois listeners já atualizam
  );

  // Sensores Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function loadHabits() {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const habitsData = await getUserHabitsOrdered(currentUser.uid);
        setHabits(habitsData);
      } catch (error) {
        console.error('Erro ao carregar hábitos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHabits();
  }, [currentUser?.uid]);

  // 2️⃣ LISTENER EM TEMPO REAL - MÊS ATUAL (CORRIGIDO)
  useEffect(() => {
    if (!currentUser?.uid) {
      setCurrentMonthTracking({});
      setLoading(false);
      return;
    }

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const docRef = doc(db, 'habits', currentUser.uid, 'tracking', yearMonth);

    console.log('🔥 Iniciando listener para:', yearMonth);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('✅ Tracking atualizado:', data);
          // ✅ CORREÇÃO: Os dados já estão na raiz, não dentro de "data"
          setCurrentMonthTracking(data || {});
        } else {
          console.log('📭 Nenhum tracking para este mês ainda');
          setCurrentMonthTracking({});
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Erro no listener de tracking:', error);
        setCurrentMonthTracking({});
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Limpando listener de tracking');
      unsubscribe();
    };
  }, [currentUser?.uid, year, month]);

  // 3️⃣ Carrega meses adjacentes (sem listener)
  useEffect(() => {
    async function loadAdjacentMonths() {
      if (!currentUser?.uid) return;

      const { prevYear, prevMonth, nextYear, nextMonth } = getAdjacentMonths(year, month);

      try {
        const [prevTracking, nextTracking] = await Promise.all([
          getMonthTracking(currentUser.uid, prevYear, prevMonth),
          getMonthTracking(currentUser.uid, nextYear, nextMonth),
        ]);

        setPrevMonthTracking(prevTracking);
        setNextMonthTracking(nextTracking);
      } catch (error) {
        console.error('Erro ao carregar meses adjacentes:', error);
      }
    }

    loadAdjacentMonths();
  }, [currentUser?.uid, year, month]);

  // Handlers de Drag
  function handleDragStart(event) {
    setActiveId(event.active.id);
    document.body.classList.add('dragging');
  }

  async function handleDragEnd(event) {
    document.body.classList.remove('dragging');
    const { active, over } = event;

    if (active.id !== over.id) {
      setHabits((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        updateHabitsOrder(currentUser.uid, newOrder).catch((error) => {
          console.error('Erro ao salvar ordem:', error);
        });

        return newOrder;
      });
    }

    setActiveId(null);
  }

  // Navegação de mês
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

  // Remove hábito
  async function handleRemoveHabit(habitName) {
    if (!confirm(`Tem certeza que deseja remover "${habitName}"?`)) return;

    try {
      await removeHabit(currentUser.uid, habitName);
      const habitsData = await getUserHabitsOrdered(currentUser.uid);
      setHabits(habitsData);
    } catch (error) {
      console.error('Erro ao remover hábito:', error);
    }
  }

  // Verifica se hábito está checado
  function isChecked(habitName, cellData) {
    const dayKey = String(cellData.day).padStart(2, '0');
    if (cellData.belongsTo === 'current') return currentMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'prev') return prevMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'next') return nextMonthTracking[habitName]?.[dayKey] === true;
    return false;
  }

  // Calcula % de conclusão do dia
  function getDayCompletion(cellData) {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h) => isChecked(h, cellData)).length;
    return Math.round((completed / habits.length) * 100);
  }

  // Callback após adicionar hábito
  async function handleHabitAdded() {
    const habitsData = await getUserHabitsOrdered(currentUser.uid);
    setHabits(habitsData);
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

        /* CSS otimizado para nomes dos hábitos */
        .habit-name-cell {
          width: 200px;
          min-width: 200px;
          max-width: 200px;
        }

        .habit-name-container {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 0.5rem 0.75rem;
        }

        .habit-name-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 600;
          color: #8b8b8b;
          transition: all 0.2s;
          min-width: 0;
        }

        .grip-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          opacity: 0.4;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .habit-row:hover .grip-icon {
          opacity: 1;
        }

        .habit-row:hover .habit-name-text {
          color: #a0a0a0;
          text-shadow: 0 0 8px rgba(139,139,139,0.6);
        }
        
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
        .trash-hover:hover { transform: rotate(15deg) scale(1.1); filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
        .plus-rotate:hover { transform: rotate(90deg); }
        .arrow-pulse { animation: pulse-ritual 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        .scroll-container::-webkit-scrollbar { width: 8px; }
        .scroll-container::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; margin: 8px 0; }
        .scroll-container::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8b8b8b, #6b6b6b); border-radius: 10px; border: 2px solid #1a1a1a; transition: background 0.3s ease; }
        .scroll-container::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #a0a0a0, #808080); }
        .scroll-container { scrollbar-width: thin; scrollbar-color: #8b8b8b #1a1a1a; }

        .activity-card { transition: background-color 0.3s ease, border-color 0.3s ease; }
        .activity-card:hover { background-color: #252525 !important; border-color: #8b8b8b !important; }

        .overflow-x-auto {
          overflow-x: auto;
          overflow-y: visible;
        }

        .habits-table-wrapper {
          position: relative;
          overflow: hidden;
          width: 100%;
        }

        body.dragging {
          overflow: hidden !important;
        }

        [data-dnd-kit-dragging] {
          position: fixed !important;
          z-index: 9999;
          pointer-events: none;
        }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter relative">
        {/* Header */}
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

        {/* Tabela com Drag & Drop */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="habits-table-wrapper overflow-x-auto scrollbar-thin scrollbar-thumb-[#8b8b8b]/30 scrollbar-track-transparent"
          >
            <div className="min-w-full max-w-[1400px] mx-auto">
              <table className="w-full min-w-[1000px] table-fixed border-collapse">
                {/* Headers */}
                <thead>
                  <tr className="bg-[#252525]">
                    <th className="sticky left-0 z-20 bg-[#252525] px-3 py-2 text-left font-bold text-[#8b8b8b] border-r border-[#8b8b8b]/30 habit-name-cell">
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

                {/* Body com Drag & Drop */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={habits} strategy={verticalListSortingStrategy}>
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
                          <HabitRow
                            key={habit}
                            habit={habit}
                            calendar={calendar}
                            pulsingDays={pulsingDays}
                            particles={particles}
                            onToggleDay={handleToggleDay}
                            onRemove={handleRemoveHabit}
                            isChecked={isChecked}
                          />
                        ))
                      )}

                      {/* Linha Total % */}
                      <HabitStats
                        calendar={calendar}
                        habits={habits}
                        fireEmoji={fireEmoji}
                        getDayCompletion={getDayCompletion}
                      />
                    </tbody>
                  </SortableContext>
                </DndContext>
              </table>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal de Adicionar */}
      <AddHabitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        userId={currentUser?.uid}
        availableActivities={customActivities}
        loadingActivities={loadingCustomActivities}
        onHabitAdded={handleHabitAdded}
      />
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
        week.push({
          day: daysInPrevMonth + dayCounter,
          belongsTo: 'prev',
        });
      } else if (dayCounter <= daysInMonth) {
        week.push({
          day: dayCounter,
          belongsTo: 'current',
        });
      } else {
        week.push({
          day: dayCounter - daysInMonth,
          belongsTo: 'next',
        });
      }
      dayCounter++;
    }
    weeks.push(week);
  }

  return { weeks };
}
