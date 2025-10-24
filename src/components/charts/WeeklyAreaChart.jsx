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
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana atual, -1 = semana passada
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState({ start: '', end: '' });

  useEffect(() => {
    loadWeekData();
  }, [weekOffset]);

  async function loadWeekData() {
    setLoading(true);

    // Calcular datas da semana
    const today = new Date();
    const currentDay = today.getDay(); // 0 = domingo, 1 = segunda...

    // Ajustar para começar na segunda-feira
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setDate(monday.getDate() + weekOffset * 7);

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);

    setWeekDates({
      start: formatDateForDisplay(weekStart),
      end: formatDateForDisplay(weekEnd),
    });

    // Criar array com os 7 dias da semana
    const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const data = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = formatDateForQuery(date);

      data.push({
        day: daysOfWeek[i],
        date: dateStr,
        minutes: 0,
        hours: 0,
      });
    }

    // Buscar atividades da semana
    const weekStartStr = formatDateForQuery(weekStart);
    const weekEndStr = formatDateForQuery(weekEnd);

    try {
      const q = query(
        collection(db, 'activities'),
        where('date', '>=', weekStartStr),
        where('date', '<=', weekEndStr)
      );

      const snapshot = await getDocs(q);

      // Somar minutos por dia
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateForDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  function handlePreviousWeek() {
    setWeekOffset((prev) => prev - 1);
  }

  function handleNextWeek() {
    if (weekOffset < 0) {
      setWeekOffset((prev) => prev + 1);
    }
  }

  // Calcular total da semana
  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.day}</p>
          <p className="text-sm text-primary-600">{formatDuration(data.minutes)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center text-gray-500">Carregando gráfico...</div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            📈 Produtividade Semanal (Wagner + Marlon)
          </h2>
          <p className="text-sm text-gray-500">
            {weekDates.start} - {weekDates.end}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={handleNextWeek}
            disabled={weekOffset >= 0}
            className={`p-2 rounded-lg transition-colors ${
              weekOffset >= 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Próxima semana"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Estatística Total */}
      <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-primary-50 rounded-lg">
        <TrendingUp className="w-5 h-5 text-primary-600" />
        <div>
          <p className="text-sm text-primary-600 font-medium">Total da Semana</p>
          <p className="text-2xl font-bold text-primary-700">
            {totalHours}h
            <span className="text-sm text-primary-600 ml-1">({formatDuration(totalMinutes)})</span>
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '14px' }} />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '14px' }}
            label={{
              value: 'Horas',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '14px', fill: '#6b7280' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#0ea5e9"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorHours)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legenda */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💪 Quanto mais alto, mais based fomos naquele dia!
        </p>
      </div>
    </div>
  );
}
