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
import { motion } from 'framer-motion';
import pesquisaImg from '../../assets/Pesquisa1.webp';
import estudoTecnicoImg from '../../assets/EstudoTecnico.webp';
import crossfitImg from '../../assets/Crossfit.webp';
import rosarioImg from '../../assets/Rosário.webp';
import leituraImg from '../../assets/Leitura.webp';
import musculacaoImg from '../../assets/Musculação.webp';
import journalImg from '../../assets/Journal.webp';
import sonoImg from '../../assets/Sono.webp';

const activityImages = {
  Pesquisa: pesquisaImg,
  'Estudo Técnico': estudoTecnicoImg,
  Crossfit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
  Journal: journalImg,
  Sono: sonoImg,
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
      collection(db, 'activities', userId, 'entries'),
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
        await deleteDoc(doc(db, 'activities', userId, 'entries', last.id));
      } else {
        await addDoc(collection(db, 'activities', userId, 'entries'), {
          userId,
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
    await Promise.all(
      entries.map((e) => deleteDoc(doc(db, 'activities', userId, 'entries', e.id)))
    );
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

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && openActivity) {
        closeActivityModal();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [openActivity]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .btn-hover-scale {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-hover-scale:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(139, 139, 139, 0.3);
        }
        @keyframes breathing {
          0%, 100% { background-position: 0% 50%; opacity: 0.6; }
          50% { background-position: 100% 50%; opacity: 1; }
        }
        .content-fade {
          transition: opacity 0.3s ease-out, filter 0.3s ease-out;
        }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-6 border-2 border-[#8b8b8b]/20 relative">
        {/* CONTEÚDO PRINCIPAL — SEMPRE MONTADO */}
        <div
          className={`content-fade ${loading ? 'opacity-50 blur-sm pointer-events-none' : 'opacity-100 blur-0'}`}
        >
          {/* Header com navegação */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2
                className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
                style={{
                  textShadow:
                    '0 0 20px rgba(139, 139, 139, 0.5), 0 0 40px rgba(139, 139, 139, 0.3)',
                }}
              >
                {isToday(currentDate) ? 'Atividades de Hoje' : formatDateDisplay(currentDate)}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-[#8b8b8b]" />
                </button>
                {!isToday(currentDate) && (
                  <button
                    onClick={handleToday}
                    className="px-3 py-1 text-xs bg-[#8b8b8b]/10 text-[#8b8b8b] rounded-lg hover:bg-[#8b8b8b]/20 transition-colors"
                  >
                    Hoje
                  </button>
                )}
                <button
                  onClick={handleNextDay}
                  disabled={isFuture(addDays(currentDate, 1))}
                  className="p-1.5 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Próximo dia"
                >
                  <ChevronRight className="w-5 h-5 text-[#8b8b8b]" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#8b8b8b]/10 rounded-lg">
              <Clock className="w-5 h-5 text-[#8b8b8b]" />
              <span className="text-base font-bold text-[#8b8b8b]">
                {formatDuration(totalMinutes)}
              </span>
            </div>
          </div>

          {/* Grid de atividades */}
          {Object.keys(aggregated).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#8b8b8b] mb-2">Nenhuma atividade neste dia</p>
              <p className="text-sm text-[#8b8b8b]/70">Adicione sua primeira atividade!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(aggregated).map(([name, data], idx) => {
                const progress = data.target ? (data.total / data.target) * 100 : 0;
                const isComplete = progress >= 100;
                const activityImage = getActivityImage(name);
                const remaining = data.target ? data.target - data.total : 0;

                return (
                  <motion.div
                    key={name}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="group relative flex items-center gap-4 bg-[#1e1e1e] rounded-xl border border-[#8b8b8b]/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 p-4"
                  >
                    {/* Imagem */}
                    <button
                      onClick={() => openActivityModal(name)}
                      className="w-44 h-44 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#8b8b8b]/5 to-[#8b8b8b]/10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#8b8b8b] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
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
                      <div>
                        <h3 className="text-lg font-semibold text-[#8b8b8b] truncate mb-1">
                          {name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-[#8b8b8b]">
                            {formatDuration(data.total)}
                          </span>
                          {data.target && (
                            <span className="text-[#8b8b8b]/70">
                              / {formatDuration(data.target)} • {Math.round(progress)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {data.target && (
                        <div className="space-y-1">
                          <div className="w-full bg-[#8b8b8b]/10 rounded-full h-2 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isComplete ? 'bg-green-500' : 'bg-[#8b8b8b]'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
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
                            {isComplete && (
                              <div className="absolute inset-0 bg-white/30 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-[#8b8b8b]/70">
                            {isComplete
                              ? '✓ Meta batida!'
                              : remaining > 0
                                ? `${remaining}min restantes`
                                : ''}
                          </p>
                        </div>
                      )}

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
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b] text-[#1a1a1a] rounded-md hover:bg-[#a0a0a0] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#8b8b8b] btn-hover-scale"
                                aria-label="Adicionar 30 minutos"
                              >
                                +30
                              </button>
                              <button
                                onClick={() => handleAdjustTime(name, 45)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/50"
                                aria-label="Adicionar 45 minutos"
                              >
                                +45
                              </button>
                              <button
                                onClick={() => handleAdjustTime(name, 60)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/50"
                                aria-label="Adicionar 1 hora"
                              >
                                +1h
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteAll(name)}
                      className="absolute top-3 right-3 p-2 bg-[#1e1e1e]/90 backdrop-blur-[2px] text-[#8b8b8b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      aria-label={`Excluir todas as entradas de ${name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* SPINNER POR CIMA */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/80 backdrop-blur-[1px] rounded-2xl z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8b8b8b]"></div>
          </div>
        )}

        {/* MODAL */}
        {openActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#8b8b8b]/30">
                <h3
                  className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
                  style={{
                    textShadow: '0 0 15px rgba(139, 139, 139, 0.4)',
                  }}
                >
                  {openActivity.name}
                </h3>
                <button
                  onClick={closeActivityModal}
                  className="p-2 text-[#8b8b8b]/70 hover:text-[#8b8b8b] hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/3 flex-shrink-0">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#8b8b8b]/5 to-[#8b8b8b]/10">
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
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#8b8b8b]/10 rounded-lg">
                        <Clock className="w-4 h-4 text-[#8b8b8b]" />
                        <span className="text-sm font-bold text-[#8b8b8b]">
                          {formatDuration(openActivity.data?.total || 0)}
                        </span>
                      </div>
                      {openActivity.data?.target && (
                        <div className="text-sm text-[#8b8b8b]/70 px-3">
                          Meta: {formatDuration(openActivity.data.target)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b8b] mb-2">
                        Descrição do dia
                      </label>
                      <textarea
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                        rows={8}
                        placeholder="Descreva como foi o treino, notas, observações..."
                        className="w-full resize-y p-3 rounded-lg bg-[#1a1a1a] text-[#8b8b8b] border border-[#8b8b8b]/30 focus:border-[#8b8b8b] outline-none transition-colors"
                      />
                    </div>

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
                        className="px-4 py-2 bg-[#8b8b8b] text-[#1a1a1a] rounded-lg hover:bg-[#a0a0a0] transition-colors font-medium disabled:opacity-50 btn-hover-scale"
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
                        className="px-4 py-2 bg-[#8b8b8b]/10 text-[#8b8b8b] rounded-lg hover:bg-[#8b8b8b]/20 transition-colors font-medium ml-auto"
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
      </div>
    </>
  );
}

// Ícone X
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
