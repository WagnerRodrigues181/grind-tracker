import { useState } from 'react';
import WeeklyAreaChart from './charts/WeeklyAreaChart';
import HabitsTable from './habits/HabitsTable';

/**
 * Componente que integra o gráfico semanal e a tabela de hábitos
 * Garante que quando um hábito é marcado, o gráfico seja atualizado
 */
export default function ProductivityDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Callback chamado quando uma atividade/hábito é adicionado
  function handleActivityAdded() {
    // Incrementa a key para forçar re-render do WeeklyAreaChart
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Produtividade Semanal */}
      <WeeklyAreaChart key={refreshKey} />

      {/* Tabela de Hábitos */}
      <HabitsTable onActivityAdded={handleActivityAdded} />
    </div>
  );
}
