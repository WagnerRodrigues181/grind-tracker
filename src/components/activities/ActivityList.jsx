import { useState, useEffect } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getToday, formatDuration, timeToMinutes } from '../../utils/dateHelpers';
import { useAuth } from '../../contexts/AuthContext';
import pesquisaImg from '../../assets/Pesquisa1.webp';
import estudoTecnicoImg from '../../assets/EstudoTecnico.webp';
import crossfitImg from '../../assets/CrossFit.webp';
import rosarioImg from '../../assets/Rosário.webp';
import leituraImg from '../../assets/Leitura.webp';
import musculacaoImg from '../../assets/Musculação.webp';

const activityImages = {
  Pesquisa: pesquisaImg,
  'Estudo Técnico': estudoTecnicoImg,
  CrossFit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
};

export default function ActivityList({ refreshTrigger }) {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const customActivities = JSON.parse(localStorage.getItem('customActivities') || '[]');

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
          activitiesData.push({ id: doc.id, ...data });
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

  // Agregar por atividade
  useEffect(() => {
    const agg = {};
    activities.forEach((act) => {
      if (!agg[act.activity]) {
        const custom = customActivities.find((c) => c.name === act.activity);
        agg[act.activity] = {
          total: 0,
          target: custom?.target ? timeToMinutes(custom.target) : act.targetMinutes || null,
          entries: [],
        };
      }
      agg[act.activity].total += act.minutes;
      agg[act.activity].entries.push(act);
    });
    setAggregated(agg);
  }, [activities, customActivities]);

  async function handleAdjustTime(activityName, minutesDelta) {
    if (minutesDelta < 0) {
      const entries = aggregated[activityName]?.entries || [];
      const last = entries[entries.length - 1];
      if (!last || last.minutes + minutesDelta < 0) return;
      await deleteDoc(doc(db, 'activities', last.id));
    } else {
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName,
        minutes: minutesDelta,
        date: getToday(),
        createdAt: serverTimestamp(),
      });
    }
  }

  async function handleDeleteAll(activityName) {
    if (!confirm(`Remover TODAS as entradas de "${activityName}" hoje?`)) return;
    const entries = aggregated[activityName]?.entries || [];
    await Promise.all(entries.map((e) => deleteDoc(doc(db, 'activities', e.id))));
  }

  function getActivityImage(activityName) {
    return activityImages[activityName] || null;
  }

  if (loading) return <div className="card text-center text-primary-accent">Carregando...</div>;

  return (
    <div className="card ml-12 mr-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-accent">Atividades de Hoje</h2>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-third rounded-lg">
          <Clock className="w-5 h-5 text-primary-first" />
          <span className="text-base font-bold text-primary-first">
            {formatDuration(totalMinutes)}
          </span>
        </div>
      </div>

      {Object.keys(aggregated).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-primary-accent mb-2">Nenhuma atividade hoje ainda</p>
          <p className="text-sm text-primary-accent/70">Adicione sua primeira atividade acima!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(aggregated).map(([name, data]) => {
            const progress = data.target ? (data.total / data.target) * 100 : 0;
            const isComplete = progress >= 100;
            const activityImage = getActivityImage(name);

            return (
              <div
                key={name}
                className="group relative flex items-center gap-4 p-4 bg-primary-second rounded-xl border border-primary-accent hover:border-primary-third hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-primary-third to-primary-accent flex items-center justify-center">
                  {activityImage ? (
                    <img src={activityImage} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">📝</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary-accent text-xl truncate mb-1 leading-tight">
                    {name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary-third" />
                    <span className="text-sm font-semibold text-primary-first">
                      {formatDuration(data.total)}
                    </span>
                    {data.target && (
                      <span className="text-primary-accent/70">
                        / {formatDuration(data.target)}
                      </span>
                    )}
                  </div>

                  {/* Barra de progresso - BREATHING (LENTO) */}
                  <div className="mt-2 w-full bg-primary-first rounded-full h-3 overflow-hidden relative">
                    <div
                      className={`absolute inset-0 h-full ${isComplete ? 'bg-white' : 'bg-primary-third'} rounded-full transition-all duration-700 ease-in-out`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                    {!isComplete && (
                      <div className="absolute inset-0">
                        <div
                          className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-breathing"
                          style={{
                            animation: 'breathing 4s ease-in-out infinite',
                            backgroundSize: '300% 100%',
                          }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-breathing-delayed"
                          style={{
                            animation: 'breathing 4s ease-in-out 1.2s infinite',
                            backgroundSize: '300% 100%',
                          }}
                        />
                      </div>
                    )}
                    {isComplete && <div className="absolute inset-0 bg-white/30 animate-pulse" />}
                  </div>

                  <p className="text-xs mt-1 text-primary-accent/70">
                    {isComplete ? 'Meta batida!' : `${data.target - data.total}min restantes`}
                  </p>

                  {/* Botões */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAdjustTime(name, -30)}
                      className="px-3 py-1 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 transition"
                    >
                      −30min
                    </button>
                    {!isComplete && (
                      <>
                        <button
                          onClick={() => handleAdjustTime(name, 30)}
                          className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                        >
                          +30min
                        </button>
                        <button
                          onClick={() => handleAdjustTime(name, 45)}
                          className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                        >
                          +45min
                        </button>
                        <button
                          onClick={() => handleAdjustTime(name, 60)}
                          className="px-3 py-1 bg-primary-third text-primary-first rounded-lg text-xs hover:bg-primary-accent transition"
                        >
                          +1h
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAll(name)}
                  className="absolute top-2 right-2 p-2 text-primary-accent hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir todas"
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
