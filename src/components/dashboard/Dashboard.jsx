import { useState } from 'react';
import Header from '../header/Header';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import Footer from '../Footer';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleActivityAdded() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-primary-first">
      <Header />

      <main className="w-full px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-8">
          {/* GRÁFICO SEMANAL - DESTAQUE NO TOPO */}
          <div className="w-full">
            <WeeklyAreaChart key={refreshTrigger} />
          </div>

          <div className="w-full">
            <ActivityList refreshTrigger={refreshTrigger} onRefresh={handleActivityAdded} />
          </div>

          {/* FORMULÁRIO + TABELA DE HÁBITOS - LADO A LADO */}
          <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-8">
            <div>
              <ActivityForm onActivityAdded={handleActivityAdded} />
            </div>
            <div>
              <HabitsTable onActivityAdded={handleActivityAdded} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
