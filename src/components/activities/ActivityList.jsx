import { useState, useEffect } from 'react';
import { Clock, Trash2, User } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { getToday, formatDuration } from '../../utils/dateHelpers';

export default function ActivityList({ refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    // Query para buscar atividades de hoje
    const q = query(
      collection(db, 'activities'),
      where('date', '==', getToday()),
      orderBy('createdAt', 'desc')
    );

    // Listener em tempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = [];
        let total = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          activitiesData.push({
            id: doc.id,
            ...data,
          });
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

    // Cleanup
    return () => unsubscribe();
  }, [refreshTrigger]);

  async function handleDelete(id) {
    if (window.confirm('Tem certeza que deseja excluir esta atividade?')) {
      try {
        await deleteDoc(doc(db, 'activities', id));
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir atividade');
      }
    }
  }

  // Extrair nome do usuário do email
  function getUserName(email) {
    const name = email?.split('@')[0] || 'Usuário';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">📋 Atividades de Hoje</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 rounded-lg">
          <Clock className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-bold text-primary-700">
            Total: {formatDuration(totalMinutes)}
          </span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Nenhuma atividade hoje ainda</p>
          <p className="text-sm text-gray-400">Adicione sua primeira atividade acima! 💪</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{activity.activity}</h3>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm font-medium text-primary-600">
                    {formatDuration(activity.minutes)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{getUserName(activity.userEmail)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(activity.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir atividade"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
