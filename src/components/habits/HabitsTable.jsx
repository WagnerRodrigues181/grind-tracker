import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserHabits,
  addHabit,
  removeHabit,
  getMonthTracking,
  toggleHabitDay,
  getHabitDuration,
} from '../../services/habitsService';
import { db } from '../../services/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { timeToMinutes } from '../../utils/dateHelpers';

// Atividades pré-definidas (mesmo do ActivityForm)
const PREDEFINED_ACTIVITIES = [
  { name: 'Musculação', duration: '01:00' },
  { name: 'CrossFit', duration: '01:00' },
  { name: 'Estudo', duration: '04:00' },
  { name: 'Pesquisa', duration: '02:00' },
  { name: 'Rosário (Terço)', duration: '00:20' },
  { name: 'Journaling', duration: '00:30' },
  { name: 'Leitura', duration: '00:30' },
  { name: 'Meditação', duration: '00:15' },
  { name: 'Corrida', duration: '00:45' },
];

export default function HabitsTable() {
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
  const [error, setError] = useState('');
  const [showPredefinedSelect, setShowPredefinedSelect] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  useEffect(() => {
    loadData();
  }, [currentUser, currentDate]);

  async function loadData() {
    if (!currentUser) return;

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

  function goToPreviousMonth() {
    setCurrentDate(new Date(year, month - 2, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month, 1));
  }

  async function handleAddHabitFromPredefined(predefinedActivity) {
    try {
      await addHabit(currentUser.uid, predefinedActivity.name, predefinedActivity.duration);
      setShowPredefinedSelect(false);
      setShowAddModal(false);
      await loadData();
    } catch (error) {
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
      setShowAddModal(false);
      setShowPredefinedSelect(false);
      setError('');
      await loadData();
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
      const dayKey = String(day).padStart(2, '0');
      const currentValue = currentMonthTracking[habitName]?.[dayKey] === true;

      // Atualização otimista
      setCurrentMonthTracking((prev) => ({
        ...prev,
        [habitName]: {
          ...prev[habitName],
          [dayKey]: !currentValue,
        },
      }));

      // Atualizar no servidor
      await toggleHabitDay(currentUser.uid, year, month, day, habitName);

      if (!currentValue) {
        // MARCANDO: registrar atividade
        await registerHabitAsActivity(habitName, year, month, day);
      } else {
        // DESMARCANDO: remover atividade
        await removeHabitActivity(habitName, year, month, day);
      }
    } catch (error) {
      console.error('Erro ao toggle dia:', error);
      await loadData();
    }
  }

  async function registerHabitAsActivity(habitName, year, month, day) {
    try {
      // Buscar duração padrão do hábito
      const duration = await getHabitDuration(currentUser.uid, habitName);

      if (!duration) {
        console.warn(`Hábito "${habitName}" não tem duração definida`);
        return;
      }

      // Converter duração para minutos
      const minutes = timeToMinutes(duration);

      // Formatar data no formato YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Adicionar no Firestore
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: habitName,
        minutes,
        date: dateStr,
        createdAt: serverTimestamp(),
      });

      console.log(`✅ Hábito "${habitName}" registrado como atividade em ${dateStr} (${duration})`);
    } catch (error) {
      console.error('Erro ao registrar hábito como atividade:', error);
    }
  }

  async function removeHabitActivity(habitName, year, month, day) {
    try {
      // Formatar data no formato YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Buscar a atividade correspondente
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', currentUser.uid),
        where('activity', '==', habitName),
        where('date', '==', dateStr)
      );

      const snapshot = await getDocs(q);

      // Deletar todas as atividades que correspondem (normalmente será apenas 1)
      const deletePromises = [];
      snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, 'activities', docSnapshot.id)));
      });

      await Promise.all(deletePromises);

      console.log(`🗑️ Atividade "${habitName}" removida de ${dateStr}`);
    } catch (error) {
      console.error('Erro ao remover atividade do hábito:', error);
    }
  }

  function isChecked(habitName, cellData) {
    const dayKey = String(cellData.day).padStart(2, '0');

    if (cellData.belongsTo === 'current') {
      return currentMonthTracking[habitName]?.[dayKey] === true;
    } else if (cellData.belongsTo === 'prev') {
      return prevMonthTracking[habitName]?.[dayKey] === true;
    } else if (cellData.belongsTo === 'next') {
      return nextMonthTracking[habitName]?.[dayKey] === true;
    }
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Hábitos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
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

      {/* Tabela */}
      <div className="overflow-hidden">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 px-2 py-1 text-left font-semibold text-gray-700 border-r border-gray-300 w-20">
                Hábitos
              </th>
              {calendar.weeks.map((_, idx) => (
                <th
                  key={idx}
                  colSpan={7}
                  className="px-1 py-1 text-center font-semibold text-gray-700 border-l border-gray-300"
                >
                  {year}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-gray-50 border-l border-gray-300 w-6"></th>
            </tr>

            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 border-r border-gray-300"></th>
              {calendar.weeks.map((_, idx) => (
                <th
                  key={idx}
                  colSpan={7}
                  className="px-1 py-1 text-center text-[9px] font-medium text-gray-600 border-l border-gray-300"
                >
                  Semana {idx + 1}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-gray-50 border-l border-gray-300"></th>
            </tr>

            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="sticky left-0 z-20 bg-gray-100 border-r border-gray-300"></th>
              {calendar.weeks.map((week, weekIdx) =>
                week.map((_, dayIdx) => (
                  <th
                    key={`${weekIdx}-${dayIdx}`}
                    className={`px-0.5 py-1 text-center text-[9px] font-medium text-gray-600 ${
                      dayIdx === 0 ? 'border-l border-gray-300' : ''
                    }`}
                  >
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayIdx]}
                  </th>
                ))
              )}
              <th className="sticky right-0 z-20 bg-gray-100 border-l border-gray-300"></th>
            </tr>
          </thead>

          <tbody>
            {habits.length === 0 ? (
              <tr>
                <td
                  colSpan={calendar.weeks.length * 7 + 2}
                  className="px-4 py-8 text-center text-gray-500 text-xs"
                >
                  Nenhum hábito cadastrado
                </td>
              </tr>
            ) : (
              habits.map((habit) => (
                <tr key={habit} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-[10px] font-medium text-gray-900 border-r border-gray-300 truncate">
                    {habit}
                  </td>
                  {calendar.weeks.map((week, weekIdx) =>
                    week.map((cellData, dayIdx) => {
                      const checked = isChecked(habit, cellData);
                      const isCurrent = cellData.belongsTo === 'current';

                      return (
                        <td
                          key={`${weekIdx}-${dayIdx}`}
                          className={`px-0.5 py-1.5 text-center ${dayIdx === 0 ? 'border-l border-gray-300' : ''}`}
                        >
                          <button
                            onClick={
                              isCurrent ? () => handleToggleDay(habit, cellData.day) : undefined
                            }
                            disabled={!isCurrent}
                            className={`w-4 h-4 rounded-full transition-all duration-150 ${
                              checked
                                ? isCurrent
                                  ? 'bg-green-400 border-2 border-green-500 shadow-sm'
                                  : 'bg-green-700 border-2 border-green-700'
                                : isCurrent
                                  ? 'bg-transparent border-2 border-gray-300 hover:border-gray-500'
                                  : 'bg-gray-300 border-2 border-gray-300'
                            } ${!isCurrent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          />
                        </td>
                      );
                    })
                  )}
                  <td className="sticky right-0 z-10 bg-white border-l border-gray-300">
                    <button
                      onClick={() => handleRemoveHabit(habit)}
                      className="p-0.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}

            {habits.length > 0 && (
              <tr className="bg-gray-50 border-t-2 border-gray-400">
                <td className="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-700 border-r border-gray-300">
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

                    return (
                      <td
                        key={`${weekIdx}-${dayIdx}`}
                        className={`px-0.5 py-1.5 text-center ${dayIdx === 0 ? 'border-l border-gray-300' : ''}`}
                      >
                        <div
                          className={`w-[1.2rem] h-[1.2rem] mx-auto flex items-center justify-center text-[8px] font-bold text-white ${colorClass} rounded`}
                        >
                          {completion}%
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

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Adicionar Novo Hábito</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {!showPredefinedSelect ? (
              <>
                <button
                  onClick={() => setShowPredefinedSelect(true)}
                  className="w-full mb-4 p-3 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors font-medium"
                >
                  📋 Escolher de Atividades Pré-definidas
                </button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">ou</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Nome do hábito"
                  className="input-primary w-full mb-3"
                />
                <input
                  type="text"
                  value={newHabitDuration}
                  onChange={(e) => setNewHabitDuration(e.target.value)}
                  placeholder="Duração padrão (ex: 01:30)"
                  className="input-primary w-full mb-4"
                  maxLength={5}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewHabitName('');
                      setNewHabitDuration('');
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
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowPredefinedSelect(false)}
                  className="mb-4 text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Voltar
                </button>

                <div className="space-y-2">
                  {PREDEFINED_ACTIVITIES.map((activity) => (
                    <button
                      key={activity.name}
                      onClick={() => handleAddHabitFromPredefined(activity)}
                      className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    >
                      <div className="font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-500">Duração: {activity.duration}</div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowPredefinedSelect(false);
                    setError('');
                  }}
                  className="btn-secondary w-full mt-4"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== FUNÇÕES AUXILIARES =====

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
