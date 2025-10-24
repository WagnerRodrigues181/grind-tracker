import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserHabits,
  addHabit,
  removeHabit,
  getMonthTracking,
  toggleHabitDay,
} from '../../services/habitsService';

export default function HabitsTable() {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habits, setHabits] = useState([]);
  const [tracking, setTracking] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [error, setError] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Gerar estrutura de semanas do mês com dias de meses vizinhos
  const weeks = generateMonthWeeks(year, month);

  useEffect(() => {
    loadData();
  }, [currentUser, currentDate]);

  async function loadData() {
    if (!currentUser) return;

    setLoading(true);
    try {
      const [habitsData, trackingData] = await Promise.all([
        getUserHabits(currentUser.uid),
        getMonthTracking(currentUser.uid, year, month),
      ]);

      setHabits(habitsData);
      setTracking(trackingData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(year, month - 2, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month, 1));
  }

  async function handleAddHabit() {
    if (!newHabitName.trim()) {
      setError('Digite um nome para o hábito');
      return;
    }

    try {
      await addHabit(currentUser.uid, newHabitName.trim());
      await loadData();
      setNewHabitName('');
      setShowAddModal(false);
      setError('');
    } catch (error) {
      setError(error.message);
    }
  }

  async function handleRemoveHabit(habitName) {
    if (!confirm(`Tem certeza que deseja remover "${habitName}"?`)) return;

    try {
      await removeHabit(currentUser.uid, habitName);
      await loadData();
    } catch (error) {
      console.error('Erro ao remover hábito:', error);
    }
  }

  async function handleToggleDay(habitName, day) {
    try {
      await toggleHabitDay(currentUser.uid, year, month, day, habitName);
      await loadData();
    } catch (error) {
      console.error('Erro ao toggle dia:', error);
    }
  }

  function isDayChecked(habitName, day) {
    const dayKey = String(day).padStart(2, '0');
    return tracking[habitName]?.[dayKey] === true;
  }

  // Calcular completion % por dia
  function getDayCompletion(day) {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h) => isDayChecked(h, day)).length;
    return Math.round((completed / habits.length) * 100);
  }

  function getCompletionColor(percentage) {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Hábitos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
              {getMonthName(month)} {year}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="ml-2 p-1 hover:bg-primary-50 text-primary-600 rounded transition-colors"
              title="Adicionar hábito"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Grade */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {/* Linha 1: Ano */}
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 px-2 py-1 text-left font-semibold text-gray-700 border-r border-gray-200">
                Hábitos
              </th>
              {weeks.map((week, idx) => (
                <th
                  key={idx}
                  colSpan={week.days.length}
                  className="px-1 py-1 text-center font-semibold text-gray-700 border-l border-gray-300"
                >
                  {year}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-gray-50 px-1 border-l border-gray-300"></th>
            </tr>

            {/* Linha 2: Semanas */}
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200"></th>
              {weeks.map((week, idx) => (
                <th
                  key={idx}
                  colSpan={week.days.length}
                  className="px-1 py-1 text-center text-[10px] font-medium text-gray-600 border-l border-gray-300"
                >
                  Semana {idx + 1}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-gray-50 border-l border-gray-300"></th>
            </tr>

            {/* Linha 3: Dias da semana */}
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="sticky left-0 z-20 bg-gray-100 border-r border-gray-200"></th>
              {weeks.map((week, weekIdx) =>
                week.days.map((day, dayIdx) => (
                  <th
                    key={`${weekIdx}-${dayIdx}`}
                    className={`px-1 py-1 text-center text-[10px] font-medium text-gray-600 ${
                      dayIdx === 0 ? 'border-l border-gray-300' : ''
                    }`}
                  >
                    {getDayName(day.dayOfWeek)}
                  </th>
                ))
              )}
              <th className="sticky right-0 z-20 bg-gray-100 border-l border-gray-300"></th>
            </tr>
          </thead>

          <tbody>
            {/* Linhas de Hábitos */}
            {habits.length === 0 ? (
              <tr>
                <td
                  colSpan={weeks.reduce((acc, w) => acc + w.days.length, 0) + 2}
                  className="px-4 py-8 text-center text-gray-500 text-sm"
                >
                  Nenhum hábito cadastrado
                </td>
              </tr>
            ) : (
              habits.map((habit) => (
                <tr key={habit} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                    {habit}
                  </td>
                  {weeks.map((week, weekIdx) =>
                    week.days.map((dayItem, dayIdx) => {
                      const isCurrentMonth = dayItem.month === month;
                      const isChecked = isDayChecked(habit, dayItem.day);
                      return (
                        <td
                          key={`${weekIdx}-${dayIdx}`}
                          className={`px-1 py-2 text-center ${dayIdx === 0 ? 'border-l border-gray-300' : ''}`}
                        >
                          <button
                            onClick={
                              isCurrentMonth ? () => handleToggleDay(habit, dayItem.day) : undefined
                            }
                            disabled={!isCurrentMonth}
                            className={`w-5 h-5 rounded-full transition-all duration-200 ${
                              isChecked
                                ? 'bg-green-500 border-green-500'
                                : !isCurrentMonth
                                  ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
                                  : 'bg-transparent border-2 border-gray-200 hover:border-gray-400'
                            }`}
                          />
                        </td>
                      );
                    })
                  )}
                  <td className="sticky right-0 z-10 bg-white px-1 border-l border-gray-300">
                    <button
                      onClick={() => handleRemoveHabit(habit)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}

            {/* Linha de Completion % */}
            {habits.length > 0 && (
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-700 border-r border-gray-200">
                  Completion %
                </td>
                {weeks.map((week, weekIdx) =>
                  week.days.map((dayItem, dayIdx) => {
                    if (dayItem.day === null) {
                      return (
                        <td
                          key={`${weekIdx}-${dayIdx}`}
                          className={`bg-gray-50 ${dayIdx === 0 ? 'border-l border-gray-300' : ''}`}
                        />
                      );
                    }
                    const completion = getDayCompletion(dayItem.day);
                    const colorClass = getCompletionColor(completion);
                    return (
                      <td
                        key={`${weekIdx}-${dayIdx}`}
                        className={`px-1 py-2 ${dayIdx === 0 ? 'border-l border-gray-300' : ''}`}
                      >
                        <div className="flex justify-center">
                          <div
                            className={`w-full h-4 ${colorClass} rounded`}
                            title={`${completion}%`}
                          ></div>
                        </div>
                      </td>
                    );
                  })
                )}
                <td className="sticky right-0 z-10 bg-gray-50 border-l border-gray-300"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar Hábito */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Adicionar Novo Hábito</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
              placeholder="Ex: Journal"
              className="input-primary w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewHabitName('');
                  setError('');
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button onClick={handleAddHabit} className="btn-primary flex-1">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== FUNÇÕES AUXILIARES =====

function getMonthName(month) {
  const months = [
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
  return months[month - 1];
}

function getDayName(dayOfWeek) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[dayOfWeek];
}

function generateMonthWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const prevMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun
  const endDayOfWeek = lastDay.getDay();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const weeks = [];
  let week = [];
  let currentDay = 1 - startDayOfWeek; // Começa antes do dia 1 pra pegar dias do mês anterior

  // Preencher semanas completas
  while (weeks.length < 6) {
    // Garante pelo menos 6 semanas pra cobrir qualquer mês
    if (week.length === 7) {
      weeks.push({ days: week });
      week = [];
    }

    const date = new Date(year, month - 1, currentDay);
    const dayOfWeek = date.getDay();
    const dayMonth = date.getMonth() + 1;

    if (currentDay < 1) {
      week.push({ day: daysInPrevMonth + currentDay, month: dayMonth, dayOfWeek });
    } else if (currentDay <= daysInMonth) {
      week.push({ day: currentDay, month: dayMonth, dayOfWeek });
    } else {
      week.push({ day: currentDay - daysInMonth, month: dayMonth, dayOfWeek });
    }

    currentDay++;
    if (currentDay > daysInMonth + (7 - endDayOfWeek)) break;
  }

  // Completa a última semana se necessário
  if (week.length > 0) {
    while (week.length < 7) {
      const date = new Date(year, month, week.length - endDayOfWeek);
      const dayOfWeek = date.getDay();
      const dayMonth = date.getMonth() + 1;
      week.push({ day: week.length - endDayOfWeek, month: dayMonth, dayOfWeek });
    }
    weeks.push({ days: week });
  }

  return weeks;
}
