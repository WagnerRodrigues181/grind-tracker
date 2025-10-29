import { useState, useEffect } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { getToday, formatDuration } from '../../utils/dateHelpers';

// ===== IMPORTAÇÃO DAS IMAGENS =====
import pesquisaImg from '../../assets/Pesquisa.png';
import estudoImg from '../../assets/Estudo.webp';
import crossfitImg from '../../assets/CrossFit.webp';
import rosarioImg from '../../assets/Rosário.webp';
import leituraImg from '../../assets/Leitura.webp';
import musculacaoImg from '../../assets/Musculação.webp';
// import leitura from '../../assets/Leitura.webp';

const activityImages = {
  Pesquisa: pesquisaImg,
  Estudo: estudoImg,
  CrossFit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
};

export default function ActivityList({ refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      where('date', '==', getToday()),
      orderBy('createdAt', 'desc')
    );

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

  function getActivityImage(activityName) {
    return activityImages[activityName] || null;
  }

  if (loading) {
    return (
      <div className="card ml-8 mr-8">
        <div className="text-center text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="card ml-12 mr-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📋 Atividades de Hoje</h2>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
          <Clock className="w-5 h-5 text-primary-600" />
          <span className="text-base font-bold text-primary-700">
            {formatDuration(totalMinutes)}
          </span>
        </div>
      </div>

      {/* Lista */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">Nenhuma atividade hoje ainda</p>
          <p className="text-sm text-gray-400">Adicione sua primeira atividade acima! 💪</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity) => {
            const activityImage = getActivityImage(activity.activity);

            return (
              <div
                key={activity.id}
                className="group relative flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all duration-200"
              >
                {/* Imagem do card */}
                <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                  {activityImage ? (
                    <img
                      src={activityImage}
                      alt={activity.activity}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">📝</span>
                  )}
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-xl truncate mb-1 leading-tight">
                    {activity.activity}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-semibold text-primary-600">
                      {formatDuration(activity.minutes)}
                    </span>
                  </div>
                </div>

                {/* Botão deletar */}
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir atividade"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
