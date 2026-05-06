import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeHabit, getMonthTracking } from '../../services/habitsService';
import { getUserHabitsOrdered, updateHabitsOrder } from '../../services/habitsService';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext';
import { useHabitsTracking } from '../../hooks/useHabitsTracking';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

import HabitRow from './HabitRow';
import HabitStats from './HabitStats';
import AddHabitModal from './AddHabitModal';

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

// ── Semana que contém hoje ────────────────────────────────────────────────────
function getInitialWeekIndex(year, month, weeks) {
  const today = new Date();
  if (today.getFullYear() !== year || today.getMonth() + 1 !== month) return 0;
  const todayDay = today.getDate();
  const idx = weeks.findIndex((week) =>
    week.some((c) => c.belongsTo === 'current' && c.day === todayDay)
  );
  return idx >= 0 ? idx : 0;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

  // Semana (mobile)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weekDirection, setWeekDirection] = useState(1);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { handleToggleDay, pulsingDays, fireEmoji, particles } = useHabitsTracking(
    habits,
    currentMonthTracking,
    year,
    month,
    () => {}
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Carrega hábitos ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadHabits() {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }
      try {
        setHabits(await getUserHabitsOrdered(currentUser.uid));
      } catch (err) {
        console.error('Erro ao carregar hábitos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHabits();
  }, [currentUser?.uid]);

  // ── Listener mês atual ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) {
      setCurrentMonthTracking({});
      setLoading(false);
      return;
    }
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const docRef = doc(db, 'habits', currentUser.uid, 'tracking', yearMonth);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        setCurrentMonthTracking(snap.exists() ? (snap.data() ?? {}) : {});
        setLoading(false);
      },
      (err) => {
        console.error('Erro no listener:', err);
        setCurrentMonthTracking({});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser?.uid, year, month]);

  // ── Meses adjacentes ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAdjacent() {
      if (!currentUser?.uid) return;
      const { prevYear, prevMonth, nextYear, nextMonth } = getAdjacentMonths(year, month);
      try {
        const [p, n] = await Promise.all([
          getMonthTracking(currentUser.uid, prevYear, prevMonth),
          getMonthTracking(currentUser.uid, nextYear, nextMonth),
        ]);
        setPrevMonthTracking(p);
        setNextMonthTracking(n);
      } catch (err) {
        console.error('Erro meses adjacentes:', err);
      }
    }
    loadAdjacent();
  }, [currentUser?.uid, year, month]);

  // Calendário calculado uma vez
  const calendar = generateCalendar(year, month);
  const allCells = calendar.weeks.flat(); // células de todo o mês (desktop)
  const totalWeeks = calendar.weeks.length;

  // ── Reset semana ao trocar mês ────────────────────────────────────────────
  useEffect(() => {
    setCurrentWeekIndex(getInitialWeekIndex(year, month, calendar.weeks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // ── Drag ─────────────────────────────────────────────────────────────────
  function handleDragStart(event) {
    setActiveId(event.active.id);
    document.body.classList.add('dragging');
  }
  async function handleDragEnd(event) {
    document.body.classList.remove('dragging');
    const { active, over } = event;
    if (active.id !== over.id) {
      setHabits((items) => {
        const newOrder = arrayMove(items, items.indexOf(active.id), items.indexOf(over.id));
        updateHabitsOrder(currentUser.uid, newOrder).catch(console.error);
        return newOrder;
      });
    }
    setActiveId(null);
  }

  // ── Navegação mês ─────────────────────────────────────────────────────────
  function goToPreviousMonth() {
    setArrowPulse((p) => ({ ...p, left: true }));
    setTimeout(() => setArrowPulse((p) => ({ ...p, left: false })), 300);
    setCurrentDate(new Date(year, month - 2, 1));
  }
  function goToNextMonth() {
    setArrowPulse((p) => ({ ...p, right: true }));
    setTimeout(() => setArrowPulse((p) => ({ ...p, right: false })), 300);
    setCurrentDate(new Date(year, month, 1));
  }

  // ── Navegação semana (mobile) ─────────────────────────────────────────────
  function goToPreviousWeek() {
    if (currentWeekIndex === 0) return;
    setWeekDirection(-1);
    setCurrentWeekIndex((i) => i - 1);
  }
  function goToNextWeek() {
    if (currentWeekIndex >= totalWeeks - 1) return;
    setWeekDirection(1);
    setCurrentWeekIndex((i) => i + 1);
  }

  // ── Remove hábito ─────────────────────────────────────────────────────────
  async function handleRemoveHabit(habitName) {
    if (!confirm(`Tem certeza que deseja remover "${habitName}"?`)) return;
    try {
      await removeHabit(currentUser.uid, habitName);
      setHabits(await getUserHabitsOrdered(currentUser.uid));
    } catch (err) {
      console.error('Erro ao remover:', err);
    }
  }

  //  Helpers
  function isChecked(habitName, cellData) {
    const dayKey = String(cellData.day).padStart(2, '0');
    if (cellData.belongsTo === 'current') return currentMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'prev') return prevMonthTracking[habitName]?.[dayKey] === true;
    if (cellData.belongsTo === 'next') return nextMonthTracking[habitName]?.[dayKey] === true;
    return false;
  }
  function getDayCompletion(cellData) {
    if (habits.length === 0) return 0;
    return Math.round((habits.filter((h) => isChecked(h, cellData)).length / habits.length) * 100);
  }
  async function handleHabitAdded() {
    setHabits(await getUserHabitsOrdered(currentUser.uid));
  }

  // Semana visível (mobile)
  const visibleWeek = calendar.weeks[currentWeekIndex] ?? calendar.weeks[0];

  // Loading
  if (loading) {
    return (
      <div className="p-8 bg-[#1e1e1e] rounded-xl">
        <div className="text-center text-[#8b8b8b]">Carregando...</div>
      </div>
    );
  }

  // Cabeçalho de dias compartilhado (helper) ──────────────────────────────
  function DayHeaderCell({ cellData, colIdx }) {
    const today = new Date();
    const isToday =
      cellData.belongsTo === 'current' &&
      cellData.day === today.getDate() &&
      year === today.getFullYear() &&
      month === today.getMonth() + 1;
    const isCurrent = cellData.belongsTo === 'current';
    return (
      <th className="px-0.5 py-1.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`text-[9px] font-medium ${isCurrent ? 'text-[#8b8b8b]/70' : 'text-[#8b8b8b]/25'}`}
          >
            {DAY_NAMES[colIdx % 7]}
          </span>
          <span
            className={`text-[10px] sm:text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
              isToday
                ? 'bg-[#8b8b8b] text-[#1a1a1a]'
                : isCurrent
                  ? 'text-[#8b8b8b]'
                  : 'text-[#8b8b8b]/25'
            }`}
          >
            {cellData.day}
          </span>
        </div>
      </th>
    );
  }

  // DnD tbody compartilhado ───────────────────────────────────────────────
  function HabitsBody({ cells }) {
    return (
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
                  colSpan={cells.length + 2}
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
                  visibleWeek={cells}
                  pulsingDays={pulsingDays}
                  particles={particles}
                  onToggleDay={handleToggleDay}
                  onRemove={handleRemoveHabit}
                  isChecked={isChecked}
                />
              ))
            )}
            <HabitStats
              visibleWeek={cells}
              habits={habits}
              fireEmoji={fireEmoji}
              getDayCompletion={getDayCompletion}
            />
          </tbody>
        </SortableContext>
      </DndContext>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter  { font-family: 'Inter', sans-serif; }

        /* ── Coluna nome ── */
        .habit-name-cell {
          width: 130px; min-width: 130px; max-width: 130px;
        }
        @media (min-width: 640px) {
          .habit-name-cell { width: 200px; min-width: 200px; max-width: 200px; }
        }

        .habit-name-container {
          display: flex; align-items: center; gap: 6px;
          width: 100%; padding: 0.4rem 0.5rem;
        }
        .habit-name-text {
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 11px; font-weight: 600; color: #8b8b8b;
          transition: all 0.2s; min-width: 0;
        }
        .grip-icon {
          flex-shrink: 0; opacity: 0.4; transition: opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .habit-row:hover .grip-icon       { opacity: 1; }
        .habit-row:hover .habit-name-text { color: #a0a0a0; text-shadow: 0 0 8px rgba(139,139,139,0.6); }

        /* ── Colunas de dia (mobile) ── */
        .day-col-mobile {
          width: calc((100% - 130px - 32px) / 7);
          min-width: 36px;
        }

        /* ── Botão semana ── */
        .week-nav-btn:disabled             { opacity: 0.25; cursor: not-allowed; }
        .week-nav-btn:not(:disabled):hover { background: #2a2a2a; border-color: rgba(139,139,139,0.5); }

        /* ── Animações ── */
        @keyframes pulse-ritual {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.2); }
        }
        @keyframes particle-fly {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes fire-appear {
          0%   { transform: scale(0) translateY(10px); opacity: 0; }
          50%  { transform: scale(1.2) translateY(-5px); opacity: 1; }
          100% { transform: scale(0) translateY(-20px); opacity: 0; }
        }
        @keyframes rotate-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .pulse-ritual    { animation: pulse-ritual 0.6s cubic-bezier(0.4,0,0.2,1); }
        .particle-effect {
          position: absolute; width: 6px; height: 6px; background: #8b8b8b;
          border-radius: 50%; pointer-events: none;
          animation: particle-fly 0.8s cubic-bezier(0.4,0,0.2,1) forwards;
          box-shadow: 0 0 8px #8b8b8b;
        }
        .fire-emoji    { position: absolute; font-size: 20px; pointer-events: none; z-index: 50; animation: fire-appear 1.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .rotating-ring { animation: rotate-ring 8s linear infinite; }
        .diagonal-pattern { background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139,139,139,0.03) 10px, rgba(139,139,139,0.03) 20px); }
        .trash-hover:hover { transform: rotate(15deg) scale(1.1); filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
        .plus-rotate:hover { transform: rotate(90deg); }
        .arrow-pulse       { animation: pulse-ritual 0.3s cubic-bezier(0.4,0,0.2,1); }

        body.dragging { overflow: hidden !important; }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter">
        {/* ══ HEADER (mês) — igual em mobile e desktop ══════════════════════ */}
        <div className="p-4 sm:p-6 border-b-2 border-[#8b8b8b]/30 bg-gradient-to-br from-[#1e1e1e] to-[#252525] diagonal-pattern relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8b8b8b]/5 to-transparent" />
          <div className="flex items-center justify-between relative z-10 gap-2">
            <h2
              className="text-xl sm:text-2xl font-bold text-[#8b8b8b] font-cinzel"
              style={{
                textShadow: '0 0 20px rgba(139,139,139,0.5), 0 0 40px rgba(139,139,139,0.3)',
              }}
            >
              Hábitos
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={goToPreviousMonth}
                className={`p-1.5 sm:p-2 bg-[#252525] rounded-lg transition-all duration-300 border border-[#8b8b8b]/20 hover:border-[#8b8b8b]/50 hover:shadow-lg hover:shadow-[#8b8b8b]/20 ${arrowPulse.left ? 'arrow-pulse' : ''}`}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#8b8b8b]" />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-[#8b8b8b] min-w-[100px] sm:min-w-[140px] text-center px-2 sm:px-4 py-1.5 sm:py-2 bg-[#252525]/50 rounded-lg border border-[#8b8b8b]/20">
                {getMonthName(month)} {year}
              </span>
              <button
                onClick={goToNextMonth}
                className={`p-1.5 sm:p-2 bg-[#252525] rounded-lg transition-all duration-300 border border-[#8b8b8b]/20 hover:border-[#8b8b8b]/50 hover:shadow-lg hover:shadow-[#8b8b8b]/20 ${arrowPulse.right ? 'arrow-pulse' : ''}`}
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#8b8b8b]" />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="ml-1 p-1.5 sm:p-2 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#8b8b8b]/40"
                title="Adicionar hábito"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 plus-rotate" />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MOBILE — uma semana por vez
        ══════════════════════════════════════════════════════════════════ */}
        <div className="block sm:hidden">
          {/* Barra de navegação de semana */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-[#8b8b8b]/20">
            <button
              onClick={goToPreviousWeek}
              disabled={currentWeekIndex === 0}
              className="week-nav-btn flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#8b8b8b]/20 bg-[#252525] transition-all duration-200 text-[#8b8b8b]"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Anterior</span>
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-semibold text-[#8b8b8b]/80 tracking-wider uppercase">
                Semana {currentWeekIndex + 1}
                <span className="text-[#8b8b8b]/40"> / {totalWeeks}</span>
              </span>
              <div className="flex gap-1">
                {calendar.weeks.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setWeekDirection(i > currentWeekIndex ? 1 : -1);
                      setCurrentWeekIndex(i);
                    }}
                    className={`rounded-full transition-all duration-200 ${
                      i === currentWeekIndex
                        ? 'w-4 h-1.5 bg-[#8b8b8b]'
                        : 'w-1.5 h-1.5 bg-[#8b8b8b]/30 hover:bg-[#8b8b8b]/60'
                    }`}
                    aria-label={`Ir para semana ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={goToNextWeek}
              disabled={currentWeekIndex >= totalWeeks - 1}
              className="week-nav-btn flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#8b8b8b]/20 bg-[#252525] transition-all duration-200 text-[#8b8b8b]"
              aria-label="Próxima semana"
            >
              <span className="text-[10px] font-semibold">Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabela semanal animada */}
          <AnimatePresence mode="wait" custom={weekDirection}>
            <motion.div
              key={`${year}-${month}-w${currentWeekIndex}`}
              custom={weekDirection}
              variants={{
                enter: (dir) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
                center: { opacity: 1, x: 0 },
                exit: (dir) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="w-full"
            >
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-[#1e1e1e] border-b-2 border-[#8b8b8b]/40">
                    {/* Coluna nome */}
                    <th className="sticky left-0 z-20 bg-[#1e1e1e] border-r border-[#8b8b8b]/30 habit-name-cell" />
                    {/* 7 colunas de dia */}
                    {visibleWeek.map((cellData, idx) => (
                      <th key={idx} className="day-col-mobile px-1 py-2 text-center">
                        <DayHeaderCell cellData={cellData} colIdx={idx} />
                      </th>
                    ))}
                    {/* Coluna remover */}
                    <th className="sticky right-0 z-20 bg-[#1e1e1e] border-l border-[#8b8b8b]/30 w-8" />
                  </tr>
                </thead>
                <HabitsBody cells={visibleWeek} />
              </table>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DESKTOP — mês completo com scroll horizontal
        ══════════════════════════════════════════════════════════════════ */}
        <div className="hidden sm:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${year}-${month}-desktop`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-x-auto"
            >
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  {/* Coluna nome, fixa */}
                  <col style={{ width: '200px', minWidth: '200px' }} />
                  {/* Colunas de dia,dividem o espaço restante igualmente */}
                  {allCells.map((_, i) => (
                    <col
                      key={i}
                      style={{
                        width: `calc((100% - 232px) / ${allCells.length})`,
                        minWidth: '20px',
                      }}
                    />
                  ))}
                  {/* Coluna lixeira, fixa */}
                  <col style={{ width: '32px', minWidth: '32px' }} />
                </colgroup>

                <thead>
                  {/* Linha 1: agrupamento por semana */}
                  <tr className="bg-[#252525]">
                    <th className="sticky left-0 z-20 bg-[#252525] px-3 py-2 text-left font-bold text-[#8b8b8b] text-xs border-r border-[#8b8b8b]/30 habit-name-cell">
                      Hábito
                    </th>
                    {calendar.weeks.map((_, wIdx) => (
                      <th
                        key={wIdx}
                        colSpan={7}
                        className="px-2 py-2 text-center text-[10px] font-semibold text-[#8b8b8b]/70 border-l border-[#8b8b8b]/30"
                      >
                        Semana {wIdx + 1}
                      </th>
                    ))}
                    <th className="sticky right-0 z-20 bg-[#252525] border-l border-[#8b8b8b]/30 w-8" />
                  </tr>

                  {/* Linha 2: dia por dia (nome + número) */}
                  <tr className="bg-[#1e1e1e] border-b-2 border-[#8b8b8b]/40">
                    <th className="sticky left-0 z-20 bg-[#1e1e1e] border-r border-[#8b8b8b]/30 habit-name-cell" />
                    {calendar.weeks.map((week, wIdx) =>
                      week.map((cellData, dIdx) => (
                        <th
                          key={`${wIdx}-${dIdx}`}
                          className={`px-0.5 py-1.5 text-center ${dIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
                        >
                          <DayHeaderCell cellData={cellData} colIdx={dIdx} />
                        </th>
                      ))
                    )}
                    <th className="sticky right-0 z-20 bg-[#1e1e1e] border-l border-[#8b8b8b]/30 w-8" />
                  </tr>
                </thead>

                {/* Todas as células do mês */}
                <HabitsBody cells={allCells} />
              </table>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonthName(month) {
  return [
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
  ][month - 1];
}

function getAdjacentMonths(year, month) {
  return {
    prevMonth: month === 1 ? 12 : month - 1,
    prevYear: month === 1 ? year - 1 : year,
    nextMonth: month === 12 ? 1 : month + 1,
    nextYear: month === 12 ? year + 1 : year,
  };
}

function generateCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const endDayOfWeek = lastDay.getDay();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const totalCells = startDayOfWeek + daysInMonth + (6 - endDayOfWeek);
  const weeks = [];
  let dayCounter = 1 - startDayOfWeek;

  for (let w = 0; w < Math.ceil(totalCells / 7); w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (dayCounter < 1) week.push({ day: daysInPrevMonth + dayCounter, belongsTo: 'prev' });
      else if (dayCounter <= daysInMonth) week.push({ day: dayCounter, belongsTo: 'current' });
      else week.push({ day: dayCounter - daysInMonth, belongsTo: 'next' });
      dayCounter++;
    }
    weeks.push(week);
  }

  return { weeks };
}
