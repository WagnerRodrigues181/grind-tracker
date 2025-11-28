import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Trash2, ChevronLeft, ChevronRight, Timer, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
import { useTimer } from '../../contexts/TimerContext';
import { motion, AnimatePresence } from 'framer-motion';
import TimerModal from '../timer/TimerModal';
import { onCustomActivitiesSnapshot } from '../../services/activitiesService';

import {
  debugLog,
  getActivityImage,
  aggregateActivities,
  adjustActivityTime,
  deleteAllActivityEntries,
  fetchActivityDescription,
  saveActivityDescription,
  deleteActivityDescription,
  saveTimerActivity,
} from '../../utils/activityListHelpers';

export default function ActivityList({ refreshTrigger, onRefresh }) {
  const { currentUser } = useAuth();
  const { startTimer } = useTimer();

  const [activities, setActivities] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [currentDate, setCurrentDate] = useState(getToday());

  const [openActivity, setOpenActivity] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [descLoading, setDescLoading] = useState(false);

  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const userId = useMemo(() => currentUser?.uid, [currentUser?.uid]);

  // Salvo a posição do scroll ANTES de qualquer atualização
  const scrollPositionRef = useRef(0);
  const isUpdatingRef = useRef(false);

  const [customActivities, setCustomActivities] = useState([]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomActivities([]);
      return;
    }

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      console.log('Custom activities carregadas (ActivityList):', activities);
      setCustomActivities(activities);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const unsubscribeRef = useRef(null);

  // Hook que restaura o scroll SEMPRE que o DOM mudar
  useEffect(() => {
    if (isUpdatingRef.current) {
      // Bloqueia scroll no HTML
      document.documentElement.classList.add('scroll-lock');

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
        // Dupla verificação para garantir
        setTimeout(() => {
          window.scrollTo(0, scrollPositionRef.current);
          document.documentElement.classList.remove('scroll-lock');
          isUpdatingRef.current = false;
        }, 50);
      });
    }
  });

  // Cleanup do scroll lock
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('scroll-lock');
    };
  }, []);

  // ============================================
  // LISTENER FIRESTORE (SEM FLASH DE LOADING)
  // ============================================
  useEffect(() => {
    if (!userId) {
      setActivities([]);
      setTotalMinutes(0);
      setIsFirstLoad(false);
      return;
    }

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
        // aqui salvo a posição do scroll ANTES de processar
        scrollPositionRef.current = window.scrollY;
        isUpdatingRef.current = true;

        const activitiesData = [];
        let total = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.date === currentDate) {
            activitiesData.push({ id: docSnap.id, ...data });

            // Só soma minutos se for timed e tiver valor numérico
            if (data.type !== 'binary' && typeof data.minutes === 'number') {
              total += data.minutes;
            }
          }
        });

        activitiesData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });

        setActivities(activitiesData);
        setTotalMinutes(total);
        setIsFirstLoad(false);
      },
      (error) => {
        console.error('❌ Erro no onSnapshot:', error);
        setActivities([]);
        setTotalMinutes(0);
        setIsFirstLoad(false);
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

  // ============================================
  // AGREGAÇÃO
  // ============================================
  useEffect(() => {
    const agg = aggregateActivities(activities, customActivities, timeToMinutes);
    setAggregated(agg);
  }, [activities, customActivities]);

  // ============================================
  // NAVEGAÇÃO
  // ============================================
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

  // ============================================
  // HANDLERS
  // ============================================
  async function handleAdjustTime(activityName, minutesDelta) {
    await adjustActivityTime(
      activityName,
      minutesDelta,
      aggregated,
      userId,
      currentUser,
      currentDate,
      onRefresh
    );
  }

  async function handleDeleteAll(activityName) {
    await deleteAllActivityEntries(
      activityName,
      aggregated,
      userId,
      currentDate,
      formatDateDisplay,
      onRefresh
    );
  }

  async function openActivityModal(name) {
    const image = getActivityImage(name);
    const data = aggregated[name];
    const desc = await fetchActivityDescription(userId, currentDate, name);
    setDescriptionText(desc);
    setOpenActivity({ name, image, data });
  }

  function closeActivityModal() {
    setOpenActivity(null);
    setDescriptionText('');
    document.body.style.overflow = '';
  }

  async function handleSaveDescription() {
    try {
      setDescLoading(true);
      await saveActivityDescription(userId, currentDate, openActivity.name, descriptionText);
      closeActivityModal();
    } catch (err) {
      alert('Erro ao salvar descrição. Tente novamente.');
    } finally {
      setDescLoading(false);
    }
  }

  async function handleDeleteDescription() {
    if (!confirm('Remover descrição desta atividade?')) return;
    try {
      await deleteActivityDescription(userId, currentDate, openActivity.name);
      setDescriptionText('');
      closeActivityModal();
    } catch (err) {
      console.error('Erro ao remover descrição:', err);
    }
  }

  function handleStartTimer(activityName) {
    setSelectedActivity(activityName);
    setShowTimerModal(true);
  }

  async function handleTimerComplete(activityName, totalSeconds) {
    await saveTimerActivity(
      activityName,
      totalSeconds,
      userId,
      currentUser,
      currentDate,
      onRefresh
    );
  }

  function handleTimerStart(hours, minutes, seconds) {
    startTimer(selectedActivity, hours, minutes, seconds, (totalSeconds) => {
      handleTimerComplete(selectedActivity, totalSeconds);
    });
  }

  // ============================================
  // CLEANUP
  // ============================================
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

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        
        html.scroll-lock {
          overflow-anchor: none !important;
          scroll-behavior: auto !important;
        }
        
        /* Container estável */
        .activity-container {
          min-height: 500px;
          position: relative;
          contain: layout;
        }
        
        /* Grid 4 colunas */
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
          contain: layout;
        }
        
        @media (min-width: 768px) {
          .activity-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .activity-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (min-width: 1280px) {
          .activity-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        /* Cards com hover */
        .activity-card {
          transform: translateZ(0);
          backface-visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          contain: layout style paint;
        }
        
        .activity-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(139, 139, 139, 0.1), transparent);
          transition: left 0.5s ease;
          pointer-events: none;
        }
        
        .activity-card:hover {
          transform: translateY(-2px) translateZ(0);
          box-shadow: 0 8px 24px rgba(139, 139, 139, 0.3);
          border-color: rgba(139, 139, 139, 0.5);
        }
        
        .activity-card:hover::before {
          left: 100%;
        }
        
        /* Efeito de onda */
        @keyframes breathing {
          0%, 100% { 
            background-position: 0% 50%; 
            opacity: 0.6; 
          }
          50% { 
            background-position: 100% 50%; 
            opacity: 1; 
          }
        }
        
        .progress-wave {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          background-size: 300% 100%;
          animation: breathing 4s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-6 border-2 border-[#8b8b8b]/20">
        <div className="activity-container">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2
                className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
                style={{ textShadow: '0 0 20px rgba(139, 139, 139, 0.5)' }}
              >
                {isToday(currentDate) ? 'Atividades de Hoje' : formatDateDisplay(currentDate)}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
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

          {/* Conteúdo */}
          {isFirstLoad ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8b8b8b]"></div>
            </div>
          ) : Object.keys(aggregated).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#8b8b8b] mb-2">Nenhuma atividade neste dia</p>
              <p className="text-sm text-[#8b8b8b]/70">Adicione sua primeira atividade!</p>
            </div>
          ) : (
            <div className="activity-grid">
              <AnimatePresence mode="popLayout">
                {Object.entries(aggregated).map(([name, data]) => {
                  const progress = data.target ? (data.total / data.target) * 100 : 0;
                  const isComplete = progress >= 100;
                  const activityImage = getActivityImage(name);
                  const remaining = data.target ? data.target - data.total : 0;

                  return (
                    <motion.div
                      key={name}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                        opacity: { duration: 0.15 },
                      }}
                      className="activity-card group relative flex items-center gap-4 bg-[#1e1e1e] rounded-xl border border-[#8b8b8b]/30 p-4"
                    >
                      {/* Imagem */}
                      <button
                        onClick={() => openActivityModal(name)}
                        className="w-44 h-44 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#8b8b8b]/5 to-[#8b8b8b]/10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]"
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

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[#8b8b8b] truncate mb-1">
                            {name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            {data.type === 'binary' ? (
                              <div className="flex items-center gap-2 text-green-400 font-semibold">
                                <CheckCircle2 className="w-5 h-5" />
                                Concluído
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-[#8b8b8b]">
                                  {formatDuration(data.total)}
                                </span>
                                {data.target && (
                                  <span className="text-[#8b8b8b]/70">
                                    / {formatDuration(data.target)} • {Math.round(progress)}%
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Barra de progresso visual para binary */}
                        {data.type === 'binary' ? (
                          <div className="space-y-1">
                            <div className="w-full bg-green-500/20 rounded-full h-2 overflow-hidden relative">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all duration-300"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <p className="text-xs text-green-400/90 font-medium">
                              ✓ Tarefa concluída com sucesso
                            </p>
                          </div>
                        ) : data.target ? (
                          <div className="space-y-1">
                            <div className="w-full bg-[#8b8b8b]/10 rounded-full h-2 overflow-hidden relative">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isComplete ? 'bg-green-500' : 'bg-[#8b8b8b]'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                              {!isComplete && <div className="progress-wave" />}
                            </div>
                            <p className="text-xs text-[#8b8b8b]/70">
                              {isComplete
                                ? '✓ Meta batida!'
                                : remaining > 0
                                  ? `${remaining}min restantes`
                                  : ''}
                            </p>
                          </div>
                        ) : null}
                        {isToday(currentDate) ? (
                          // DIA ATUAL: Botões rápidos para atividade em andamento
                          <div className="flex flex-wrap gap-2">
                            {data.type !== 'binary' && (
                              <button
                                onClick={() => handleAdjustTime(name, -30)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                              >
                                −30
                              </button>
                            )}
                            {data.type !== 'binary' && (
                              <>
                                {/* Timer APENAS no dia atual */}
                                {isToday(currentDate) && (
                                  <button
                                    onClick={() => handleStartTimer(name)}
                                    className="flex-1 min-w-[48px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-md hover:from-blue-500/20 hover:to-purple-500/20 transition-colors border border-blue-500/20"
                                  >
                                    <Timer className="w-3.5 h-3.5" />
                                    <span>Timer</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAdjustTime(name, 30)}
                                  className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b] text-[#1a1a1a] rounded-md hover:bg-[#a0a0a0] transition-colors"
                                >
                                  +30
                                </button>
                                <button
                                  onClick={() => handleAdjustTime(name, 45)}
                                  className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
                                >
                                  +45
                                </button>
                                <button
                                  onClick={() => handleAdjustTime(name, 60)}
                                  className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
                                >
                                  +1h
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          data.type !== 'binary' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAdjustTime(name, -30)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                              >
                                −30
                              </button>
                              <button
                                onClick={() => handleAdjustTime(name, 30)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b] text-[#1a1a1a] rounded-md hover:bg-[#a0a0a0] transition-colors"
                              >
                                +30
                              </button>
                              <button
                                onClick={() => handleAdjustTime(name, 45)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
                              >
                                +45
                              </button>
                              <button
                                onClick={() => handleAdjustTime(name, 60)}
                                className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
                              >
                                +1h
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAll(name)}
                        className="absolute top-3 right-3 p-2 bg-[#1e1e1e]/90 text-[#8b8b8b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modal */}
        {openActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-3xl bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#8b8b8b]/30">
                <h3 className="text-2xl font-bold text-[#8b8b8b] font-cinzel">
                  {openActivity.name}
                </h3>
                <button
                  onClick={closeActivityModal}
                  className="p-2 text-[#8b8b8b]/70 hover:text-[#8b8b8b] hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
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
                        {openActivity.data?.type === 'binary' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-bold text-green-400">Concluído</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-[#8b8b8b]" />
                            <span className="text-sm font-bold text-[#8b8b8b]">
                              {formatDuration(openActivity.data?.total || 0)}
                            </span>
                          </>
                        )}
                      </div>
                      {openActivity.data?.target && openActivity.data?.type !== 'binary' && (
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
                        onClick={handleSaveDescription}
                        className="px-4 py-2 bg-[#8b8b8b] text-[#1a1a1a] rounded-lg hover:bg-[#a0a0a0] transition-colors font-medium disabled:opacity-50"
                        disabled={descLoading}
                      >
                        {descLoading ? 'Salvando...' : 'Salvar descrição'}
                      </button>

                      <button
                        onClick={handleDeleteDescription}
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

        <TimerModal
          isOpen={showTimerModal}
          onClose={() => setShowTimerModal(false)}
          activityName={selectedActivity}
          onStart={handleTimerStart}
        />
      </div>
    </>
  );
}

function X({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
