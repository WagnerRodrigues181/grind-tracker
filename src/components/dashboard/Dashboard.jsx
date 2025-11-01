import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import { formatDateDisplay, getToday } from '../../utils/dateHelpers';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const userName = currentUser?.email?.split('@')[0] || 'Usuário';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  function handleActivityAdded() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-primary-first">
      <header className="bg-primary-second shadow-sm border-b border-primary-accent">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <div className="flex items-center gap-3">
              {/* Ícone grande sem bolinha */}
              <img
                src="/favicon-96x96.png"
                alt="Grind Tracker"
                className="w-12 h-12 object-cover"
              />

              <div>
                <h1 className="text-xl font-bold text-primary-accent">Grind Tracker</h1>
                <p className="text-sm text-primary-accent">{formatDateDisplay(getToday())}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-accent rounded-lg">
                <User className="w-4 h-4 text-primary-second" />
                <span className="text-sm font-medium text-primary-second">{displayName}</span>
              </div>

              <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

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
    </div>
  );
}
