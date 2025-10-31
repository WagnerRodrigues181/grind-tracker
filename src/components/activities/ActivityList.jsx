import { useState, useEffect } from 'react';
import { Clock, Trash2, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getToday,
  formatDuration,
  timeToMinutes,
  addDays,
  formatDateDisplay,
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  getDayName,
  getMonthStart,
  getMonthEnd,
  getMonthName,
  isToday,
  isFuture,
  formatDate,
} from '../../utils/dateHelpers';
import { useAuth } from '../../contexts/AuthContext';
import pesquisaImg from '../../assets/Pesquisa1.webp';
import estudoTecnicoImg from '../../assets/EstudoTecnico.webp';
import crossfitImg from '../../assets/CrossFit.webp';
import rosarioImg from '../../assets/Rosário.webp';
import leituraImg from '../../assets/Leitura.webp';
import musculacaoImg from '../../assets/Musculação.webp';

const activityImages = {
  Pesquisa: pesquisaImg,
  'Estudo Técnico': estudoTecnicoImg,
  CrossFit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
};

export default function ActivityList({ refreshTrigger }) {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [currentDate, setCurrentDate] = useState(getToday());
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week' ou 'month'

  const customActivities = JSON.parse(localStorage.getItem('customActivities') || '[]');

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      where('date', '==', currentDate),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = [];
        let total = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          activitiesData.push({ id: doc.id, ...data });
          total += data.minutes;
        });
        setActivities(activitiesData);
        setTotalMinutes(total);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar atividades:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentDate, refreshTrigger]);

  useEffect(() => {
    const agg = {};
    activities.forEach((act) => {
      if (!agg[act.activity]) {
        const custom = customActivities.find((c) => c.name === act.activity);
        agg[act.activity] = {
          total: 0,
          target: custom?.target ? timeToMinutes(custom.target) : act.targetMinutes || null,
          entries: [],
        };
      }
      agg[act.activity].total += act.minutes;
      agg[act.activity].entries.push(act);
    });
    setAggregated(agg);
  }, [activities, customActivities]);

  async function handleAdjustTime(activityName, minutesDelta) {
    if (minutesDelta < 0) {
      const entries = aggregated[activityName]?.entries || [];
      const last = entries[entries.length - 1];
      if (!last || last.minutes + minutesDelta < 0) return;
      await deleteDoc(doc(db, 'activities', last.id));
    } else {
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName,
        minutes: minutesDelta,
        date: currentDate,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function handleDeleteAll(activityName) {
    if (
      !confirm(
        `Remover TODAS as entradas de "${activityName}" em ${formatDateDisplay(currentDate)}?`
      )
    )
      return;
    const entries = aggregated[activityName]?.entries || [];
    await Promise.all(entries.map((e) => deleteDoc(doc(db, 'activities', e.id))));
  }

  function getActivityImage(activityName) {
    return activityImages[activityName] || null;
  }

  function handlePreviousDay() {
    setCurrentDate(addDays(currentDate, -1));
  }

  function handleNextDay() {
    if (!isFuture(addDays(currentDate, 1))) {
      setCurrentDate(addDays(currentDate, 1));
    }
  }

  function handleToday() {
    setCurrentDate(getToday());
  }

  if (loading) {
    return (
      <div className="card ml-12 mr-8 max-w-6xl flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="card ml-12 mr-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-primary-accent">
              {isToday(currentDate) ? 'Atividades de Hoje' : formatDateDisplay(currentDate)}
            </h2>
            {!isExpanded && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-primary-third rounded-lg transition"
                  title="Dia anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-primary-accent" />
                </button>
                {!isToday(currentDate) && (
                  <button
                    onClick={handleToday}
                    className="px-3 py-1 text-xs bg-primary-third text-primary-first rounded-lg hover:bg-primary-accent transition"
                  >
                    Hoje
                  </button>
                )}
                <button
                  onClick={handleNextDay}
                  disabled={isFuture(addDays(currentDate, 1))}
                  className="p-1.5 hover:bg-primary-third rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Próximo dia"
                >
                  <ChevronRight className="w-5 h-5 text-primary-accent" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-third rounded-lg">
              <Clock className="w-5 h-5 text-primary-first" />
              <span className="text-base font-bold text-primary-first">
                {formatDuration(totalMinutes)}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-primary-third rounded-lg transition"
              title={isExpanded ? 'Minimizar' : 'Expandir'}
            >
              {isExpanded ? (
                <Minimize2 className="w-5 h-5 text-primary-accent" />
              ) : (
                <Maximize2 className="w-5 h-5 text-primary-accent" />
              )}
            </button>
          </div>
        </div>

        {Object.keys(aggregated).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-primary-accent mb-2">Nenhuma atividade neste dia</p>
            <p className="text-sm text-primary-accent/70">Adicione sua primeira atividade acima!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(aggregated).map(([name, data]) => {
              const progress = data.target ? (data.total / data.target) * 100 : 0;
              const isComplete = progress >= 100;
              const activityImage = getActivityImage(name);

              return (
                <div
                  key={name}
                  className="group relative flex items-center gap-4 p-4 bg-primary-second rounded-xl border border-primary-accent hover:border-primary-third hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-primary-third to-primary-accent flex items-center justify-center">
                    {activityImage ? (
                      <img src={activityImage} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">📝</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary-accent text-xl truncate mb-1 leading-tight">
                      {name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary-third" />
                      <span className="text-sm font-semibold text-primary-first">
                        {formatDuration(data.total)}
                      </span>
                      {data.target && (
                        <span className="text-primary-accent/70">
                          / {formatDuration(data.target)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 w-full bg-primary-first rounded-full h-3 overflow-hidden relative">
                      <div
                        className={`absolute inset-0 h-full ${isComplete ? 'bg-white' : 'bg-primary-third'} rounded-full transition-all duration-700 ease-in-out`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                      {!isComplete && (
                        <div className="absolute inset-0">
                          <div
                            className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-breathing"
                            style={{
                              animation: 'breathing 4s ease-in-out infinite',
                              backgroundSize: '300% 100%',
                            }}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-breathing-delayed"
                            style={{
                              animation: 'breathing 4s ease-in-out 1.2s infinite',
                              backgroundSize: '300% 100%',
                            }}
                          />
                        </div>
                      )}
                      {isComplete && <div className="absolute inset-0 bg-white/30 animate-pulse" />}
                    </div>

                    <p className="text-xs mt-1 text-primary-accent/70">
                      {isComplete
                        ? 'Meta batida!'
                        : data.target
                          ? `${data.target - data.total}min restantes`
                          : ''}
                    </p>

                    {isToday(currentDate) && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAdjustTime(name, -30)}
                          className="px-3 py-1 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 transition"
                        >
                          −30min
                        </button>
                        {!isComplete && (
                          <>
                            <button
                              onClick={() => handleAdjustTime(name, 30)}
                              className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                            >
                              +30min
                            </button>
                            <button
                              onClick={() => handleAdjustTime(name, 45)}
                              className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                            >
                              +45min
                            </button>
                            <button
                              onClick={() => handleAdjustTime(name, 60)}
                              className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                            >
                              +1h
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteAll(name)}
                    className="absolute top-2 right-2 p-2 text-primary-accent hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir todas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedView
            currentDate={currentDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onClose={() => setIsExpanded(false)}
            customActivities={customActivities}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ExpandedView({
  currentDate,
  viewMode,
  setViewMode,
  onClose,
  customActivities,
  currentUser,
}) {
  const [periodActivities, setPeriodActivities] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const startDate = viewMode === 'week' ? getWeekStart(currentDate) : getMonthStart(currentDate);
    const endDate = viewMode === 'week' ? getWeekEnd(currentDate) : getMonthEnd(currentDate);

    const q = query(
      collection(db, 'activities'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const byDate = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!byDate[data.date]) byDate[data.date] = {};
        if (!byDate[data.date][data.activity]) {
          const custom = customActivities.find((c) => c.name === data.activity);
          byDate[data.date][data.activity] = {
            total: 0,
            target: custom?.target ? timeToMinutes(custom.target) : data.targetMinutes || null,
          };
        }
        byDate[data.date][data.activity].total += data.minutes;
      });
      setPeriodActivities(byDate);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate, viewMode, customActivities]);

  const dates = viewMode === 'week' ? getWeekDays(currentDate) : getAllMonthDays(currentDate);

  function getActivityImage(activityName) {
    return activityImages[activityName] || null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-primary-first/80 flex items-center justify-center z-50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-primary-second rounded-2xl shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto relative border border-primary-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-primary-accent">
            {viewMode === 'week'
              ? `Semana de ${formatDateDisplay(getWeekStart(currentDate))} a ${formatDateDisplay(getWeekEnd(currentDate))}`
              : `${getMonthName(currentDate)} ${new Date(currentDate).getFullYear()}`}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex bg-primary-first rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-md text-sm transition ${
                  viewMode === 'week'
                    ? 'bg-primary-third text-primary-first'
                    : 'text-primary-accent hover:bg-primary-third/50'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-md text-sm transition ${
                  viewMode === 'month'
                    ? 'bg-primary-third text-primary-first'
                    : 'text-primary-accent hover:bg-primary-third/50'
                }`}
              >
                Mês
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-primary-accent/70 hover:text-primary-accent text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-accent"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {dates.map((date) => {
              const dayActivities = periodActivities[date] || {};
              const hasActivities = Object.keys(dayActivities).length > 0;
              const totalDay = Object.values(dayActivities).reduce(
                (sum, act) => sum + act.total,
                0
              );

              return (
                <div
                  key={date}
                  className={`p-3 rounded-xl border ${
                    isToday(date)
                      ? 'bg-primary-third/20 border-primary-third'
                      : 'bg-primary-first border-primary-accent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-primary-accent">
                        {getDayName(date)}
                      </span>
                      <span className="text-xs text-primary-accent/70">
                        {formatDateDisplay(date)}
                      </span>
                      {isToday(date) && (
                        <span className="px-2 py-0.5 bg-primary-third text-primary-first text-xs rounded-full">
                          Hoje
                        </span>
                      )}
                    </div>
                    {hasActivities && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary-third" />
                        <span className="text-sm font-semibold text-primary-accent">
                          {formatDuration(totalDay)}
                        </span>
                      </div>
                    )}
                  </div>

                  {!hasActivities ? (
                    <p className="text-xs text-primary-accent/50 italic">Nenhuma atividade</p>
                  ) : (
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {Object.entries(dayActivities).map(([name, data]) => {
                        const progress = data.target ? (data.total / data.target) * 100 : 0;
                        const isComplete = progress >= 100;
                        const activityImage = getActivityImage(name);

                        return (
                          <div
                            key={name}
                            className="p-2 bg-primary-second rounded-lg border border-primary-accent flex items-center gap-2"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary-third to-primary-accent flex items-center justify-center">
                              {activityImage ? (
                                <img
                                  src={activityImage}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl">📝</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-primary-accent truncate text-sm">
                                {name}
                              </h4>
                              <div className="flex items-center gap-0.5">
                                <span className="font-semibold text-primary-first text-xs">
                                  {formatDuration(data.total)}
                                </span>
                                {data.target && (
                                  <span className="text-primary-accent/70 text-[10px]">
                                    /{formatDuration(data.target)}
                                  </span>
                                )}
                              </div>
                              {data.target && (
                                <div className="w-full bg-primary-first rounded-full overflow-hidden mt-1 h-1.5">
                                  <div
                                    className={`h-full ${isComplete ? 'bg-green-500' : 'bg-primary-third'} rounded-full transition-all`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              )}
                              {data.target && (
                                <p className="mt-0.5 text-primary-accent/70 text-[10px]">
                                  {isComplete ? '✓' : `${data.target - data.total}m`}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Função corrigida: apenas dias do mês atual
function getAllMonthDays(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Último dia do mês atual
  const days = [];
  let current = new Date(start);
  while (current <= end) {
    days.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}
