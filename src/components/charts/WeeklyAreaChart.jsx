import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatDuration } from '../../utils/dateHelpers';

export default function WeeklyAreaChart() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState({ start: '', end: '' });

  useEffect(() => {
    loadWeekData();
  }, [weekOffset]);

  async function loadWeekData() {
    setLoading(true);
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
    const data = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      data.push({ day: daysOfWeek[i], date: formatDateForQuery(date), minutes: 0, hours: 0 });
    }

    try {
      const q = query(
        collection(db, 'activities'),
        where('date', '>=', formatDateForQuery(weekStart)),
        where('date', '<=', formatDateForQuery(weekEnd))
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const activity = doc.data();
        const dayData = data.find((d) => d.date === activity.date);
        if (dayData) {
          dayData.minutes += activity.minutes;
          dayData.hours = dayData.minutes / 60;
        }
      });
      setChartData(data);
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateForQuery(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateForDisplay(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  }

  const handlePreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => weekOffset < 0 && setWeekOffset((prev) => prev + 1);

  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary-first px-4 py-2 rounded-lg shadow-lg border border-primary-accent">
          <p className="font-semibold text-primary-accent">{data.day}</p>
          <p className="text-sm text-primary-third">{formatDuration(data.minutes)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading)
    return (
      <div className="card text-center text-primary-accent py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent mx-auto"></div>
      </div>
    );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-accent mb-1">
              📈 Produtividade Semanal
            </h2>
            <p className="text-sm text-primary-accent/70">
              {weekDates.start} - {weekDates.end}
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-primary-third rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary-first" />
            <div>
              <p className="text-xs text-primary-first/80 font-medium">Total da Semana</p>
              <p className="text-xl font-bold text-primary-first">
                {totalHours}h{' '}
                <span className="text-xs text-primary-accent ml-1">
                  ({formatDuration(totalMinutes)})
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-primary-accent rounded-lg transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5 text-primary-accent" />
          </button>
          <button
            onClick={handleNextWeek}
            disabled={weekOffset >= 0}
            className={`p-2 rounded-lg transition-colors ${weekOffset >= 0 ? 'text-primary-accent/50 cursor-not-allowed' : 'hover:bg-primary-accent text-primary-accent'}`}
            title="Próxima semana"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={175}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b8b8b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b8b8b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#8b8b8b" opacity={0.3} />
          <XAxis dataKey="day" stroke="#8b8b8b" style={{ fontSize: '14px', fontWeight: '500' }} />
          <YAxis
            stroke="#8b8b8b"
            style={{ fontSize: '13px' }}
            label={{
              value: 'Horas',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '13px', fill: '#8b8b8b', fontWeight: '500' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#8b8b8b"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorHours)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 pt-3 border-t border-primary-accent">
        <p className="text-xs text-primary-accent text-center">
          💪 Quanto mais alto, mais produtivos fomos naquele dia!
        </p>
      </div>
    </div>
  );
}
