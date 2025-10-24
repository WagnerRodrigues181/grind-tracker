import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import { formatDateDisplay, getToday } from '../../utils/dateHelpers';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Extrair nome do usuário do email
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
    // Trigger para atualizar lista
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Grind Tracker</h1>
                <p className="text-sm text-gray-500">{formatDateDisplay(getToday())}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{displayName}</span>
              </div>
              <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: Formulário */}
          <div>
            <ActivityForm onActivityAdded={handleActivityAdded} />
          </div>

          {/* Coluna Direita: Lista de Atividades */}
          <div>
            <ActivityList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
