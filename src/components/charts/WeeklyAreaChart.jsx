import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, BarChart3 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatDuration } from '../../utils/dateHelpers';
import { useAuth } from '../../contexts/AuthContext';

export default function WeeklyAreaChart() {
  const { currentUser } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparisonUsers, setComparisonUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [weekDates, setWeekDates] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState('individual');

  const unsubscribeRef = useRef(null);
  const comparisonUnsubscribeRef = useRef([]);

  // === HARDCODE DOS USUÁRIOS ===
  const USER_MAP = {
    esSKmDM9XuWycUR9PpDpOX7321q2: { name: 'Wagner', color: '#525252' },
    L2II4ZwHwZNObqIi3MyxouYB6Cq1: { name: 'Marlon', color: '#3f6212' },
  };

  const getOtherUid = () => {
    return currentUser.uid === 'esSKmDM9XuWycUR9PpDpOX7321q2'
      ? 'L2II4ZwHwZNObqIi3MyxouYB6Cq1'
      : 'esSKmDM9XuWycUR9PpDpOX7321q2';
  };

  // === CARREGAR USUÁRIOS ===
  useEffect(() => {
    if (!currentUser?.uid) return;

    const knownUids = [currentUser.uid, getOtherUid()];
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('__name__', 'in', knownUids));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users = [];
        snapshot.forEach((doc) => {
          const uid = doc.id;
          const fallback = USER_MAP[uid] || { name: 'Desconhecido', color: '#cccccc' };
          const data = doc.data();
          users.push({
            uid,
            name: data.name || fallback.name,
            color: data.color || fallback.color,
          });
        });

        const sorted = users.sort((a) => (a.uid === currentUser.uid ? -1 : 1));
        setComparisonUsers(sorted.length === 2 ? sorted : []);
        setUsersLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar usuários:', error);
        const fallbackUsers = knownUids.map((uid) => ({
          uid,
          ...USER_MAP[uid],
        }));
        const sorted = fallbackUsers.sort((a) => (a.uid === currentUser.uid ? -1 : 1));
        setComparisonUsers(sorted);
        setUsersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // === CARGA DE DADOS EM TEMPO REAL ===
  useEffect(() => {
    if (!currentUser?.uid || usersLoading) {
      setLoading(true);
      return;
    }

    // Limpar tudo
    if (unsubscribeRef.current) unsubscribeRef.current();
    comparisonUnsubscribeRef.current.forEach((unsub) => unsub());
    comparisonUnsubscribeRef.current = [];

    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7);

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);

    setWeekDates({
      start: formatDateForDisplay(weekStart),
      end: formatDateForDisplay(weekEnd),
    });

    const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const emptyData = daysOfWeek.map((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return { day, date: formatDateForQuery(date), minutes: 0, hours: 0 };
    });

    setLoading(true);

    const startDate = formatDateForQuery(weekStart);
    const endDate = formatDateForQuery(weekEnd);

    // === MODO INDIVIDUAL ===
    const individualQuery = query(
      collection(db, 'activities', currentUser.uid, 'entries'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const individualUnsub = onSnapshot(
      individualQuery,
      (snapshot) => {
        const newData = emptyData.map((day) => ({ ...day, minutes: 0, hours: 0 }));
        const dayMap = new Map();

        snapshot.forEach((doc) => {
          const act = doc.data();
          dayMap.set(act.date, (dayMap.get(act.date) || 0) + act.minutes);
        });

        newData.forEach((day) => {
          const mins = dayMap.get(day.date) || 0;
          day.minutes = mins;
          day.hours = Number((mins / 60).toFixed(2));
        });

        setChartData(newData);

        if (viewMode === 'individual') {
          setLoading(false);
        }
      },
      () => {
        setChartData(emptyData);
        if (viewMode === 'individual') {
          setLoading(false);
        }
      }
    );

    unsubscribeRef.current = individualUnsub;

    // === MODO COMPARAÇÃO: ATUALIZAÇÃO EM TEMPO REAL (CORRIGIDO) ===
    if (viewMode === 'comparison' && comparisonUsers.length === 2) {
      const user1Data = new Map();
      const user2Data = new Map();

      // Função que atualiza o gráfico SEMPRE que qualquer usuário muda
      const updateComparisonChart = () => {
        const compData = emptyData.map((day) => {
          const u1 = user1Data.get(day.date) || 0;
          const u2 = user2Data.get(day.date) || 0;
          return {
            day: day.day,
            date: day.date,
            user1Minutes: u1,
            user2Minutes: u2,
            user1Hours: Number((u1 / 60).toFixed(2)),
            user2Hours: Number((u2 / 60).toFixed(2)),
          };
        });
        setComparisonData(compData);
        setLoading(false); // Sempre mostra o gráfico, mesmo se um usuário falhar
      };

      const usersToCompare = comparisonUsers.map((user) => ({
        uid: user.uid,
        isCurrent: user.uid === currentUser.uid,
      }));

      usersToCompare.forEach(({ uid, isCurrent }) => {
        const userQuery = query(
          collection(db, 'activities', uid, 'entries'),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );

        const userUnsub = onSnapshot(
          userQuery,
          (snapshot) => {
            const dayMap = new Map();
            snapshot.forEach((doc) => {
              const act = doc.data();
              dayMap.set(act.date, (dayMap.get(act.date) || 0) + act.minutes);
            });

            if (isCurrent) {
              user1Data.clear();
              dayMap.forEach((mins, date) => user1Data.set(date, mins));
            } else {
              user2Data.clear();
              dayMap.forEach((mins, date) => user2Data.set(date, mins));
            }

            // ATUALIZA O GRÁFICO IMEDIATAMENTE
            updateComparisonChart();
          },
          () => {
            if (isCurrent) user1Data.clear();
            else user2Data.clear();
            updateComparisonChart(); // Mesmo com erro, tenta atualizar
          }
        );

        comparisonUnsubscribeRef.current.push(userUnsub);
      });
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      comparisonUnsubscribeRef.current.forEach((unsub) => unsub());
      comparisonUnsubscribeRef.current = [];
    };
  }, [weekOffset, currentUser?.uid, usersLoading, comparisonUsers, viewMode]);

  // === FORMATAÇÃO ===
  const formatDateForQuery = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateForDisplay = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  };

  // === NAVEGAÇÃO E TOGGLE ===
  const handlePreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => weekOffset < 0 && setWeekOffset((prev) => prev + 1);

  const toggleViewMode = () => {
    setLoading(true);
    setViewMode((prev) => (prev === 'individual' ? 'comparison' : 'individual'));
  };

  // === CÁLCULOS ===
  const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const user1Total = comparisonData.reduce((sum, d) => sum + d.user1Minutes, 0);
  const user2Total = comparisonData.reduce((sum, d) => sum + d.user2Minutes, 0);
  const user1Hours = (user1Total / 60).toFixed(1);
  const user2Hours = (user2Total / 60).toFixed(1);
  const difference = Math.abs(user1Total - user2Total);
  const leader = user1Total > user2Total ? comparisonUsers[0]?.name : comparisonUsers[1]?.name;

  // === TOOLTIPS ===
  const IndividualTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const index = chartData.findIndex((d) => d.date === data.date);
    const prevDay = index > 0 ? chartData[index - 1] : null;
    const delta = prevDay ? data.hours - prevDay.hours : 0;

    return (
      <div className="bg-primary-first/95 backdrop-blur-sm px-3 py-2 rounded-md border border-primary-accent/30 text-xs font-medium shadow-lg">
        <p className="text-primary-accent font-semibold">{data.day}</p>
        <p className="text-primary-third">{formatDuration(data.minutes)}</p>
        {prevDay && (
          <p
            className={`text-[10px] ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-primary-third/70'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}h vs ontem
          </p>
        )}
      </div>
    );
  };

  const ComparisonTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-primary-first/95 backdrop-blur-sm px-3 py-2 rounded-md border border-primary-accent/30 text-xs font-medium shadow-lg">
        <p className="text-primary-accent font-semibold mb-1.5">{data.day}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: comparisonUsers[0]?.color }}
            ></div>
            <span className="text-primary-third">{comparisonUsers[0]?.name}:</span>
            <span className="font-semibold text-primary-accent">
              {formatDuration(data.user1Minutes)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: comparisonUsers[1]?.color }}
            ></div>
            <span className="text-primary-third">{comparisonUsers[1]?.name}:</span>
            <span className="font-semibold text-primary-accent">
              {formatDuration(data.user2Minutes)}
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-primary-accent/20">
          <p className="text-[10px] text-primary-third/70">
            Diferença: {Math.abs(data.user1Hours - data.user2Hours).toFixed(1)}h
          </p>
        </div>
      </div>
    );
  };

  // === EARLY RETURN ===
  if (usersLoading || (viewMode === 'comparison' && comparisonUsers.length < 2)) {
    return (
      <div
        className="card p-8 rounded-xl bg-primary-first/50 border border-primary-accent/10 flex items-center justify-center"
        style={{ minHeight: '420px' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent mx-auto mb-3"></div>
          <p className="text-sm text-primary-accent/70">Carregando comparação...</p>
        </div>
      </div>
    );
  }

  // === RENDER ===
  return (
    <div
      className="card p-6 md:p-8 rounded-xl shadow-sm bg-primary-first/50 backdrop-blur-sm border border-primary-accent/10 relative overflow-hidden"
      style={{ minHeight: '420px' }}
    >
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex-1"></div>
          <div className="text-center flex-1">
            <h2
              className="text-xl md:text-2xl font-bold text-[#8b8b8b] tracking-wide"
              style={{
                fontFamily: "'EB Garamond', serif",
                textShadow: '0 0 20px rgba(139, 139, 139, 0.5)',
                letterSpacing: '0.05em',
              }}
            >
              Produtividade Semanal
            </h2>
            <p className="text-xs text-primary-accent/60 mt-1">
              {weekDates.start} - {weekDates.end}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleViewMode}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-third/20 hover:bg-primary-third/30 border border-primary-accent/20 transition-all duration-300"
            >
              {viewMode === 'individual' ? (
                <>
                  {' '}
                  <Users className="w-4 h-4 text-primary-accent" />{' '}
                  <span className="text-xs font-medium text-primary-accent">Comparar</span>{' '}
                </>
              ) : (
                <>
                  {' '}
                  <BarChart3 className="w-4 h-4 text-primary-accent" />{' '}
                  <span className="text-xs font-medium text-primary-accent">Individual</span>{' '}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {viewMode === 'individual' ? (
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-third/80 backdrop-blur-sm rounded-full border border-primary-accent/20 shadow-sm">
              <span className="text-lg md:text-xl font-bold text-primary-first">{totalHours}h</span>
              <span className="text-xs text-primary-accent/80">
                ({formatDuration(totalMinutes)})
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mb-5">
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary-third/80 backdrop-blur-sm rounded-full border border-primary-accent/20 shadow-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: comparisonUsers[0]?.color }}
                ></div>
                <span className="text-xs text-primary-accent/80">{comparisonUsers[0]?.name}:</span>
                <span className="text-lg font-bold text-primary-first">{user1Hours}h</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary-third/80 backdrop-blur-sm rounded-full border border-primary-accent/20 shadow-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: comparisonUsers[1]?.color }}
                ></div>
                <span className="text-xs text-primary-accent/80">{comparisonUsers[1]?.name}:</span>
                <span className="text-lg font-bold text-primary-first">{user2Hours}h</span>
              </div>
            </div>
            {difference > 0 && (
              <p className="text-xs text-primary-accent/60">
                <span className="font-semibold text-primary-accent">{leader}</span> está à frente
                por <span className="font-bold text-green-400">{formatDuration(difference)}</span>
              </p>
            )}
          </div>
        )}

        {/* Gráfico */}
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'individual' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#8b8b8b"
                  strokeDasharray="4 6"
                  strokeOpacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#8b8b8b', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8b8b8b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip content={<IndividualTooltip />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#colorHours)"
                  dot={{ r: 4, fill: '#fbbf24' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            ) : (
              <AreaChart
                data={comparisonData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorUser1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={comparisonUsers[0]?.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={comparisonUsers[0]?.color} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUser2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={comparisonUsers[1]?.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={comparisonUsers[1]?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#8b8b8b"
                  strokeDasharray="4 6"
                  strokeOpacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#8b8b8b', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8b8b8b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip content={<ComparisonTooltip />} />
                <Area
                  type="monotone"
                  dataKey="user1Hours"
                  stroke={comparisonUsers[0]?.color}
                  fill="url(#colorUser1)"
                  dot={{ r: 4, fill: comparisonUsers[0]?.color }}
                />
                <Area
                  type="monotone"
                  dataKey="user2Hours"
                  stroke={comparisonUsers[1]?.color}
                  fill="url(#colorUser2)"
                  dot={{ r: 4, fill: comparisonUsers[1]?.color }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Navegação */}
        <div className="flex justify-center gap-3 mt-5">
          <button
            onClick={handlePreviousWeek}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-primary-accent/10 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 text-primary-accent" />
          </button>
          <button
            onClick={handleNextWeek}
            disabled={weekOffset >= 0 || loading}
            className="p-1.5 rounded-lg hover:bg-primary-accent/10 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4 text-primary-accent" />
          </button>
        </div>

        <p className="text-center text-xs text-primary-accent/50 mt-4 italic">
          {viewMode === 'individual'
            ? 'Quanto mais alto, mais perto do dever cumprido.'
            : 'A competição nos faz crescer juntos.'}
        </p>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-primary-first/70 backdrop-blur-[1px] rounded-xl z-30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-accent"></div>
            <p className="text-xs text-primary-accent/70 font-medium">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
