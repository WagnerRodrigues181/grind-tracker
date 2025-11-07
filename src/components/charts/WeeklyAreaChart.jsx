import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weekDates, setWeekDates] = useState({ start: '', end: '' });

  const unsubscribeRef = useRef(null);

  // === CARGA DE DADOS COM LISTENER EM TEMPO REAL ===
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Limpar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

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

    // Se já tenho dados, mostra loading sutil
    if (chartData.length > 0) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    const startDate = formatDateForQuery(weekStart);
    const endDate = formatDateForQuery(weekEnd);

    console.log('🔍 WeeklyChart - Configurando listener');
    console.log('UID:', currentUser.uid);
    console.log('Range:', startDate, 'até', endDate);
    console.log('Path:', `activities/${currentUser.uid}/entries`);

    // Query para a semana
    const q = query(
      collection(db, 'activities', currentUser.uid, 'entries'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    // LISTENER EM TEMPO REAL
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('WeeklyChart - Snapshot recebido:', snapshot.size, 'documentos');

        // 1. Cria base limpa
        const newData = emptyData.map((day) => ({
          ...day,
          minutes: 0,
          hours: 0,
        }));

        // 2. Acumula minutos por dia (SEM MUTAÇÃO)
        const dayMap = new Map();
        snapshot.forEach((doc) => {
          const act = doc.data();
          console.log('Documento:', {
            id: doc.id,
            activity: act.activity,
            date: act.date,
            minutes: act.minutes,
          });

          if (!dayMap.has(act.date)) {
            dayMap.set(act.date, 0);
          }
          dayMap.set(act.date, dayMap.get(act.date) + act.minutes);
        });

        // 3. Preenche newData com os totais
        newData.forEach((day) => {
          const mins = dayMap.get(day.date) || 0;
          day.minutes = mins;
          day.hours = Number((mins / 60).toFixed(2));
        });

        console.log('Dados finais do chart:', newData);
        setChartData(newData);
        setLoading(false);
        setIsRefreshing(false);
      },
      (error) => {
        console.error('Erro no listener:', error);
        setChartData(emptyData);
        setLoading(false);
        setIsRefreshing(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        console.log('🧹 Limpando listener do WeeklyChart');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [weekOffset, currentUser?.uid]);

  // === FORMATAÇÃO DE DATAS ===
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

  // === NAVEGAÇÃO ===
  const handlePreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => weekOffset < 0 && setWeekOffset((prev) => prev + 1);

  // === CÁLCULO DO TOTAL ===
  const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // === TOOLTIP COM DELTA ===
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const index = chartData.findIndex((d) => d.date === data.date);
    const prevDay = index > 0 ? chartData[index - 1] : null;
    const delta = prevDay ? data.hours - prevDay.hours : 0;

    return (
      <div className="bg-primary-first/95 backdrop-blur-sm px-3 py-2 rounded-md border border-primary-accent/30 text-xs font-medium">
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

  // === ACESSIBILIDADE: RESUMO TEXTUAL ===
  const ariaLabel = `Gráfico de produtividade semanal de ${weekDates.start} a ${weekDates.end}. Total: ${totalHours} horas. ${chartData.map((d) => `${d.day}: ${d.hours.toFixed(1)}h`).join('. ')}`;

  // === RENDER ===
  return (
    <div
      className="card p-6 md:p-8 rounded-xl shadow-sm bg-primary-first/50 backdrop-blur-sm border border-primary-accent/10 relative"
      style={{ minHeight: '380px' }}
      aria-label={ariaLabel}
    >
      {/* === OVERLAY DE LOADING (apenas isRefreshing agora, mais sutil) === */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-primary-first/40 backdrop-blur-[0.5px] rounded-xl z-20 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-accent/70"></div>
          </div>
        </div>
      )}

      {/* === CONTEÚDO PRINCIPAL (sempre montado) === */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {/* === TÍTULO + PÍLULA DO TOTAL === */}
        <div className="text-center mb-5">
          <h2
            className="text-xl md:text-2xl font-bold text-[#8b8b8b] tracking-wide"
            style={{
              fontFamily: "'EB Garamond', serif",
              textShadow: '0 0 20px rgba(139, 139, 139, 0.5), 0 0 40px rgba(139, 139, 139, 0.3)',
              letterSpacing: '0.05em',
            }}
          >
            Produtividade Semanal
          </h2>
          <p className="text-xs text-primary-accent/60 mt-1">
            {weekDates.start} - {weekDates.end}
          </p>

          <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 bg-primary-third/80 backdrop-blur-sm rounded-full border border-primary-accent/20 shadow-sm">
            <span className="text-lg md:text-xl font-bold text-primary-first">{totalHours}h</span>
            <span className="text-xs text-primary-accent/80">({formatDuration(totalMinutes)})</span>
          </div>
        </div>

        {/* === GRÁFICO COM ALTURA FIXA === */}
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b8b8b" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8b8b8b" stopOpacity={0} />
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

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#8b8b8b', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              <Area
                type="monotone"
                dataKey="hours"
                stroke="#8b8b8b"
                strokeWidth={2}
                fill="url(#colorHours)"
                fillOpacity={1}
                animationDuration={300}
                animationEasing="ease-in-out"
                isAnimationActive={!loading}
                dot={{ r: 4, fill: '#8b8b8b', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, stroke: '#8b8b8b', strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* === NAVEGAÇÃO DISCRETA === */}
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={handlePreviousWeek}
            disabled={loading || isRefreshing}
            className="p-1.5 rounded-lg hover:bg-primary-accent/10 transition-colors disabled:opacity-50"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4 text-primary-accent" />
          </button>
          <button
            onClick={handleNextWeek}
            disabled={weekOffset >= 0 || loading || isRefreshing}
            className="p-1.5 rounded-lg hover:bg-primary-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4 text-primary-accent" />
          </button>
        </div>

        {/* === LEGENDA MOTIVACIONAL === */}
        <p className="text-center text-xs text-primary-accent/50 mt-4 italic">
          💪 Quanto mais alto, mais perto do dever cumprido.
        </p>
      </div>

      {/* === LOADING INICIAL (primeiro carregamento) === */}
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
