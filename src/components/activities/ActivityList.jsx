// src/components/activities/ActivityList.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getToday,
  formatDuration,
  timeToMinutes,
  addDays,
  formatDateDisplay,
  isToday,
  isFuture,
} from '../../utils/dateHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function ActivityList({ refreshTrigger, onRefresh }) {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [currentDate, setCurrentDate] = useState(getToday());

  const [openActivity, setOpenActivity] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [descLoading, setDescLoading] = useState(false);

  const userId = useMemo(() => currentUser?.uid, [currentUser?.uid]);

  const customActivities = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('customActivities') || '[]');
    } catch {
      return [];
    }
  }, [refreshTrigger]);

  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setActivities([]);
      setTotalMinutes(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      where('date', '==', currentDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = [];
        let total = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          activitiesData.push({ id: docSnap.id, ...data });
          total += data.minutes;
        });

        activitiesData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });

        setActivities(activitiesData);
        setTotalMinutes(total);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar atividades:', error);
        setActivities([]);
        setTotalMinutes(0);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentDate, userId]);

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
    try {
      if (minutesDelta < 0) {
        const entries = aggregated[activityName]?.entries || [];
        const last = entries[entries.length - 1];
        if (!last || last.minutes + minutesDelta < 0) return;
        await deleteDoc(doc(db, 'activities', last.id));
      } else {
        await addDoc(collection(db, 'activities'), {
          userId: userId,
          userEmail: currentUser.email,
          activity: activityName,
          minutes: minutesDelta,
          date: currentDate,
          createdAt: serverTimestamp(),
        });
      }
      onRefresh?.();
    } catch (error) {
      console.error('Erro ao ajustar tempo:', error);
    }
  }

  async function handleDeleteAll(activityName) {
    if (
      !confirm(
        `Remover TODAS as entradas de "${activityName}" em ${formatDateDisplay(currentDate)}?`
      )
    )
      return;

    const entries = aggregated[activityName]?.entries || [];
    await Promise.all(entries.map((e) => deleteDoc(doc(db, 'activities', e.id))));
    onRefresh?.();
  }

  function getActivityImage(activityName) {
    return activityImages[activityName] || null;
  }

  function handlePreviousDay() {
    setCurrentDate(addDays(currentDate, -1));
  }

  function handleNextDay() {
    if (!isFuture(addDays(currentDate, 1))) {
      setCurrentDate(addDays(currentDate, 1));
    }
  }

  function handleToday() {
    setCurrentDate(getToday());
  }

  function makeDescDocId(activityName) {
    if (!userId) return null;
    return encodeURIComponent(`${userId}_${currentDate}_${activityName}`);
  }

  async function fetchDescription(activityName) {
    const id = makeDescDocId(activityName);
    if (!id) return '';
    try {
      setDescLoading(true);
      const docRef = doc(db, 'activityDescriptions', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return data.description || '';
      }
      return '';
    } catch (err) {
      console.error('Erro ao buscar descrição:', err);
      return '';
    } finally {
      setDescLoading(false);
    }
  }

  async function saveDescription(activityName, description) {
    const id = makeDescDocId(activityName);
    if (!id) throw new Error('Usuário não autenticado');
    setDescLoading(true);
    try {
      const docRef = doc(db, 'activityDescriptions', id);
      await setDoc(docRef, {
        userId,
        activity: activityName,
        date: currentDate,
        description,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao salvar descrição:', err);
      throw err;
    } finally {
      setDescLoading(false);
    }
  }

  async function deleteDescription(activityName) {
    const id = makeDescDocId(activityName);
    if (!id) return;
    try {
      const docRef = doc(db, 'activityDescriptions', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erro ao deletar descrição:', err);
    }
  }

  async function openActivityModal(name) {
    const image = getActivityImage(name);
    const data = aggregated[name];
    const desc = await fetchDescription(name);
    setDescriptionText(desc);
    setOpenActivity({ name, image, data });
    document.body.style.overflow = 'hidden';
  }

  function closeActivityModal() {
    setOpenActivity(null);
    setDescriptionText('');
    document.body.style.overflow = '';
  }

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && openActivity) {
        closeActivityModal();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [openActivity]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-primary-accent">
            {isToday(currentDate) ? 'Atividades de Hoje' : formatDateDisplay(currentDate)}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousDay}
              className="p-1.5 hover:bg-primary-accent/10 rounded-lg transition-colors"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5 text-primary-accent" />
            </button>
            {!isToday(currentDate) && (
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs bg-primary-accent/10 text-primary-accent rounded-lg hover:bg-primary-accent/20 transition-colors"
              >
                Hoje
              </button>
            )}
            <button
              onClick={handleNextDay}
              disabled={isFuture(addDays(currentDate, 1))}
              className="p-1.5 hover:bg-primary-accent/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-5 h-5 text-primary-accent" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-accent/10 rounded-lg">
          <Clock className="w-5 h-5 text-primary-accent" />
          <span className="text-base font-bold text-primary-accent">
            {formatDuration(totalMinutes)}
          </span>
        </div>
      </div>

      {/* Grid de atividades */}
      {Object.keys(aggregated).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-primary-accent mb-2">Nenhuma atividade neste dia</p>
          <p className="text-sm text-primary-accent/70">Adicione sua primeira atividade acima!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {Object.entries(aggregated).map(([name, data], idx) => {
              const progress = data.target ? (data.total / data.target) * 100 : 0;
              const isComplete = progress >= 100;
              const activityImage = getActivityImage(name);
              const remaining = data.target ? data.target - data.total : 0;

              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="group relative flex items-center gap-4 bg-primary-second rounded-xl border border-primary-accent/10 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 p-4"
                >
                  {/* Imagem */}
                  <button
                    onClick={() => openActivityModal(name)}
                    className="w-44 h-44 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-primary-accent/5 to-primary-accent/10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-accent focus:ring-offset-2 focus:ring-offset-primary-first"
                    aria-label={`Abrir detalhes de ${name}`}
                  >
                    {activityImage ? (
                      <img
                        src={activityImage}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-6xl opacity-20">📄</span>
                    )}
                  </button>

                  {/* Conteúdo do card */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Título e tempo */}
                    <div>
                      <h3 className="text-lg font-semibold text-primary-accent truncate mb-1">
                        {name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-primary-accent">
                          {formatDuration(data.total)}
                        </span>
                        {data.target && (
                          <span className="text-primary-accent/70">
                            / {formatDuration(data.target)} • {Math.round(progress)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    {data.target && (
                      <div className="space-y-1">
                        <div className="w-full bg-primary-accent/10 rounded-full h-2 overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isComplete ? 'bg-green-500' : 'bg-primary-accent'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                          {/* Animação de breathing apenas quando não completou */}
                          {!isComplete && (
                            <div className="absolute inset-0">
                              <div
                                className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                style={{
                                  animation: 'breathing 4s ease-in-out infinite',
                                  backgroundSize: '300% 100%',
                                }}
                              />
                              <div
                                className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                style={{
                                  animation: 'breathing 4s ease-in-out 1.2s infinite',
                                  backgroundSize: '300% 100%',
                                }}
                              />
                            </div>
                          )}
                          {/* Pulso quando completou */}
                          {isComplete && (
                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-primary-accent/70">
                          {isComplete
                            ? '✓ Meta batida!'
                            : remaining > 0
                              ? `${remaining}min restantes`
                              : ''}
                        </p>
                      </div>
                    )}

                    {/* Botões de ação */}
                    {isToday(currentDate) && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAdjustTime(name, -30)}
                          className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
                          aria-label="Remover 30 minutos"
                        >
                          −30
                        </button>
                        {!isComplete && (
                          <>
                            <button
                              onClick={() => handleAdjustTime(name, 30)}
                              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-primary-accent text-primary-first rounded-md hover:bg-primary-third active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-accent"
                              aria-label="Adicionar 30 minutos"
                            >
                              +30
                            </button>
                            <button
                              onClick={() => handleAdjustTime(name, 45)}
                              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-primary-accent/20 text-primary-accent rounded-md hover:bg-primary-accent/30 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-accent/50"
                              aria-label="Adicionar 45 minutos"
                            >
                              +45
                            </button>
                            <button
                              onClick={() => handleAdjustTime(name, 60)}
                              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-primary-accent/20 text-primary-accent rounded-md hover:bg-primary-accent/30 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-accent/50"
                              aria-label="Adicionar 1 hora"
                            >
                              +1h
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botão de deletar - aparece no hover */}
                  <button
                    onClick={() => handleDeleteAll(name)}
                    className="absolute top-3 right-3 p-2 bg-primary-second/90 backdrop-blur-sm text-primary-accent hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    aria-label={`Excluir todas as entradas de ${name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* CSS para animação breathing */}
      <style jsx>{`
        @keyframes breathing {
          0%,
          100% {
            background-position: 0% 50%;
            opacity: 0.6;
          }
          50% {
            background-position: 100% 50%;
            opacity: 1;
          }
        }
      `}</style>

      {/* Modal */}
      <AnimatePresence>
        {openActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeActivityModal}
              style={{ backdropFilter: 'blur(4px)' }}
            />

            {/* Card do modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-primary-second rounded-2xl shadow-2xl border border-primary-accent overflow-hidden"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Header do modal */}
              <div className="flex items-center justify-between p-6 border-b border-primary-accent/10">
                <h3 className="text-2xl font-bold text-primary-accent">{openActivity.name}</h3>
                <button
                  onClick={closeActivityModal}
                  className="p-2 text-primary-accent/70 hover:text-primary-accent hover:bg-primary-accent/10 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo do modal */}
              <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Imagem */}
                  <div className="w-full md:w-1/3 flex-shrink-0">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary-accent/5 to-primary-accent/10">
                      {openActivity.image ? (
                        <img
                          src={openActivity.image}
                          alt={openActivity.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                          📄
                        </div>
                      )}
                    </div>
                    {/* Info de tempo */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary-accent/10 rounded-lg">
                        <Clock className="w-4 h-4 text-primary-accent" />
                        <span className="text-sm font-bold text-primary-accent">
                          {formatDuration(openActivity.data?.total || 0)}
                        </span>
                      </div>
                      {openActivity.data?.target && (
                        <div className="text-sm text-primary-accent/70 px-3">
                          Meta: {formatDuration(openActivity.data.target)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-accent mb-2">
                        Descrição do dia
                      </label>
                      <textarea
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                        rows={8}
                        placeholder="Descreva como foi o treino, notas, observações..."
                        className="w-full resize-y p-3 rounded-lg bg-primary-first text-primary-accent border border-primary-accent/20 focus:border-primary-accent outline-none transition-colors"
                      />
                    </div>

                    {/* Botões de ação */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            await saveDescription(openActivity.name, descriptionText);
                            closeActivityModal();
                          } catch (err) {
                            alert('Erro ao salvar descrição. Tente novamente.');
                          }
                        }}
                        className="px-4 py-2 bg-primary-accent text-primary-first rounded-lg hover:bg-primary-third transition-colors font-medium disabled:opacity-50"
                        disabled={descLoading}
                      >
                        {descLoading ? 'Salvando...' : 'Salvar descrição'}
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm('Remover descrição desta atividade?')) return;
                          try {
                            await deleteDescription(openActivity.name);
                            setDescriptionText('');
                            closeActivityModal();
                          } catch (err) {
                            console.error('Erro ao remover descrição:', err);
                          }
                        }}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
                      >
                        Remover
                      </button>

                      <button
                        onClick={closeActivityModal}
                        className="px-4 py-2 bg-primary-accent/10 text-primary-accent rounded-lg hover:bg-primary-accent/20 transition-colors font-medium ml-auto"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Importação do ícone X que estava faltando
function X({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
