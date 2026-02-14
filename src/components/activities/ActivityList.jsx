import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Timer,
  CheckCircle2,
  Plus,
  Target,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
  formatDuration,
  timeToMinutes,
  minutesToTime,
  addDays,
  formatDateDisplay,
  isToday,
  isFuture,
} from '../../utils/dateHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext'; // ← NOVO
import { useTimer } from '../../contexts/TimerContext';
import { motion, AnimatePresence } from 'framer-motion';
import TimerModal from '../timer/TimerModal';

import {
  getActivityImage,
  aggregateActivities,
  adjustActivityTime,
  deleteAllActivityEntries,
  fetchActivityDescription,
  saveActivityDescription,
  deleteActivityDescription,
  saveTimerActivity,
} from '../../utils/activityListHelpers';

export default function ActivityList() {
  const { currentUser } = useAuth();
  const { startTimer } = useTimer();

  // ============================================
  // ✅ PEGA DADOS DO CONTEXT AO INVÉS DE PROPS E LISTENERS
  // ============================================
  const { dailyActivities, customActivities, currentDate, changeDate, totalMinutes } =
    useActivities();

  const [aggregated, setAggregated] = useState({});
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [openActivity, setOpenActivity] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [descLoading, setDescLoading] = useState(false);

  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Estados para modal de adicionar atividade
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [addActivityName, setAddActivityName] = useState('');
  const [addActivityTime, setAddActivityTime] = useState('');
  const [addActivityTarget, setAddActivityTarget] = useState('');
  const [addActivityType, setAddActivityType] = useState('timed');
  const [addActivityLoading, setAddActivityLoading] = useState(false);
  const [addActivityError, setAddActivityError] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Estado para editar meta
  const [showEditTargetModal, setShowEditTargetModal] = useState(false);
  const [editTargetActivity, setEditTargetActivity] = useState(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editTargetLoading, setEditTargetLoading] = useState(false);

  const userId = useMemo(() => currentUser?.uid, [currentUser?.uid]);

  // ============================================
  // AGREGAÇÃO (agora to usando dailyActivities do context)
  // ============================================
  useEffect(() => {
    const agg = aggregateActivities(dailyActivities, customActivities, timeToMinutes);
    setAggregated(agg);
    setIsFirstLoad(false);
  }, [dailyActivities, customActivities]);

  // ============================================
  // NAVEGAÇÃO (usa changeDate do context)
  // ============================================
  function handlePreviousDay() {
    changeDate(addDays(currentDate, -1));
  }

  function handleNextDay() {
    if (!isFuture(addDays(currentDate, 1))) {
      changeDate(addDays(currentDate, 1));
    }
  }

  function handleToday() {
    changeDate(new Date().toISOString().split('T')[0]);
  }

  // ============================================
  // HANDLERS (não precisa mais de onRefresh. os listeners resolvem)
  // ============================================
  async function handleAdjustTime(activityName, minutesDelta) {
    await adjustActivityTime(
      activityName,
      minutesDelta,
      aggregated,
      userId,
      currentUser,
      currentDate
    );
  }

  async function handleDeleteAll(activityName) {
    await deleteAllActivityEntries(
      activityName,
      aggregated,
      userId,
      currentDate,
      formatDateDisplay
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
    await saveTimerActivity(activityName, totalSeconds, userId, currentUser, currentDate);
  }

  function handleTimerStart(hours, minutes, seconds) {
    startTimer(selectedActivity, hours, minutes, seconds, (totalSeconds) => {
      handleTimerComplete(selectedActivity, totalSeconds);
    });
  }

  // Handler para adicionar atividade em dia anterior
  async function handleAddPastActivity() {
    setAddActivityError('');

    const activityName = isCustomMode ? addActivityName.trim() : addActivityName.trim();

    if (!activityName) {
      setAddActivityError('Digite o nome da atividade');
      return;
    }

    if (addActivityType === 'timed') {
      const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

      if (!addActivityTime || !timeRegex.test(addActivityTime)) {
        setAddActivityError('Tempo inválido (use HH:MM)');
        return;
      }

      if (addActivityTarget && !timeRegex.test(addActivityTarget)) {
        setAddActivityError('Meta inválida (use HH:MM)');
        return;
      }
    }

    try {
      setAddActivityLoading(true);

      if (addActivityType === 'binary') {
        await addDoc(collection(db, 'activities', userId, 'entries'), {
          userId,
          userEmail: currentUser.email,
          activity: activityName,
          type: 'binary',
          completed: true,
          date: currentDate,
          createdAt: serverTimestamp(),
        });
      } else {
        const minutes = timeToMinutes(addActivityTime);
        const targetMinutes = addActivityTarget ? timeToMinutes(addActivityTarget) : null;

        await addDoc(collection(db, 'activities', userId, 'entries'), {
          userId,
          userEmail: currentUser.email,
          activity: activityName,
          type: 'timed',
          minutes,
          targetMinutes,
          date: currentDate,
          createdAt: serverTimestamp(),
        });
      }

      // Reset e fecha modal
      setAddActivityName('');
      setAddActivityTime('');
      setAddActivityTarget('');
      setAddActivityType('timed');
      setIsCustomMode(false);
      setShowAddActivityModal(false);
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      setAddActivityError('Erro ao salvar atividade');
    } finally {
      setAddActivityLoading(false);
    }
  }

  // Handler para abrir modal de editar meta
  function handleOpenEditTarget(activityName) {
    const data = aggregated[activityName];
    setEditTargetActivity(activityName);
    setEditTargetValue(data.target ? minutesToTime(data.target) : '');
    setShowEditTargetModal(true);
  }

  // Handler para salvar nova meta do dia
  async function handleSaveTarget() {
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

    if (editTargetValue && !timeRegex.test(editTargetValue)) {
      alert('Formato inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    try {
      setEditTargetLoading(true);
      const newTargetMinutes = editTargetValue ? timeToMinutes(editTargetValue) : null;

      const entries = aggregated[editTargetActivity]?.entries || [];

      await Promise.all(
        entries.map((entry) =>
          setDoc(
            doc(db, 'activities', userId, 'entries', entry.id),
            {
              targetMinutes: newTargetMinutes,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );

      setShowEditTargetModal(false);
      setEditTargetActivity(null);
      setEditTargetValue('');

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      alert('Erro ao salvar meta');
    } finally {
      setEditTargetLoading(false);
    }
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
        
        /* ✅ REMOVIDO: scroll-lock e hacks de scroll - será tratado na FASE 4 */
        
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
          ) : (
            <div className="activity-grid">
              <AnimatePresence mode="popLayout">
                {/* Card para adicionar atividade - SEMPRE VISÍVEL */}
                <motion.div
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="activity-card group relative flex items-center justify-center gap-4 bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl border-2 border-dashed border-[#8b8b8b]/40 hover:border-[#8b8b8b] p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#8b8b8b]/20"
                  onClick={() => setShowAddActivityModal(true)}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-[#8b8b8b]/10 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-[#8b8b8b]" />
                    </div>
                    <p className="text-sm font-semibold text-[#8b8b8b]">Adicionar Atividade</p>
                    <p className="text-xs text-[#8b8b8b]/60 mt-1">
                      {Object.keys(aggregated).length === 0
                        ? 'Adicione sua primeira atividade!'
                        : 'Registrar atividade deste dia'}
                    </p>
                  </div>
                </motion.div>

                {/* Lista de atividades existentes */}
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

                        {/* Barra de progresso */}
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

                        {/* Botões de ação */}
                        {isToday(currentDate) ? (
                          // DIA ATUAL: Botões rápidos para atividade em andamento
                          <div className="flex flex-wrap gap-2">
                            {data.type !== 'binary' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditTarget(name);
                                  }}
                                  className="flex-1 min-w-[80px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/5 text-[#8b8b8b]/80 rounded-md hover:bg-[#8b8b8b]/10 transition-colors border border-[#8b8b8b]/20 flex items-center justify-center gap-1"
                                >
                                  <Target className="w-3.5 h-3.5" />
                                  Meta
                                </button>
                                <button
                                  onClick={() => handleAdjustTime(name, -30)}
                                  className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                                >
                                  −30
                                </button>
                                <button
                                  onClick={() => handleStartTimer(name)}
                                  className="flex-1 min-w-[48px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-md hover:from-blue-500/20 hover:to-purple-500/20 transition-colors border border-blue-500/20"
                                >
                                  <Timer className="w-3.5 h-3.5" />
                                  <span>Timer</span>
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
                              </>
                            )}
                          </div>
                        ) : (
                          // DIAS ANTERIORES: Botões mais simples
                          data.type !== 'binary' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditTarget(name);
                                }}
                                className="flex-1 min-w-[80px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/5 text-[#8b8b8b]/80 rounded-md hover:bg-[#8b8b8b]/10 transition-colors border border-[#8b8b8b]/20 flex items-center justify-center gap-1"
                              >
                                <Target className="w-3.5 h-3.5" />
                                Meta
                              </button>
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

                      {/* Botão deletar */}
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

        {/* Modal de Atividade (Descrição) */}
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

        {/* Modal Adicionar Atividade */}
        <AnimatePresence>
          {showAddActivityModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAddActivityModal(false)}
            >
              <motion.div
                initial={{ scale: 0.96, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 8 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 p-6"
              >
                <h3 className="text-xl font-bold text-[#8b8b8b] font-cinzel mb-4">
                  Adicionar Atividade
                </h3>
                <p className="text-sm text-[#8b8b8b]/70 mb-6">{formatDateDisplay(currentDate)}</p>

                {addActivityError && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
                    {addActivityError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* DROPDOWN DE ATIVIDADES PREDEFINIDAS */}
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b8b] mb-2">
                      Selecione uma atividade
                    </label>
                    <select
                      value={addActivityName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setAddActivityName(selectedName);

                        setIsCustomMode(selectedName === 'custom');

                        if (selectedName && selectedName !== 'custom') {
                          const activity = customActivities.find((a) => a.name === selectedName);
                          if (activity) {
                            setAddActivityType(activity.type || 'timed');
                            if (activity.type === 'timed') {
                              setAddActivityTime(activity.time || '00:30');
                              setAddActivityTarget(activity.target || '');
                            }
                          }
                        }
                      }}
                      className="w-full p-3 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    >
                      <option value="">Escolha uma predefinida ou digite abaixo</option>
                      {customActivities.map((activity) => (
                        <option key={activity.id} value={activity.name}>
                          {activity.name} {activity.type === 'binary' ? '✓' : '⏱'}
                        </option>
                      ))}
                      <option value="custom">✏️ Outra (personalizada)</option>
                    </select>
                  </div>

                  {/* CAMPO DE NOME PERSONALIZADO */}
                  {(isCustomMode || addActivityName === '') && (
                    <input
                      type="text"
                      value={isCustomMode && addActivityName === 'custom' ? '' : addActivityName}
                      onChange={(e) => setAddActivityName(e.target.value)}
                      placeholder="Nome da atividade"
                      className="w-full p-3 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    />
                  )}

                  {/* TIPO DE ATIVIDADE */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAddActivityType('timed')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        addActivityType === 'timed'
                          ? 'border-[#8b8b8b] bg-[#8b8b8b]/10'
                          : 'border-[#8b8b8b]/30'
                      }`}
                    >
                      <Clock className="w-5 h-5 mx-auto mb-1 text-[#8b8b8b]" />
                      <span className="text-xs text-[#8b8b8b]">Com Tempo</span>
                    </button>
                    <button
                      onClick={() => setAddActivityType('binary')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        addActivityType === 'binary'
                          ? 'border-[#8b8b8b] bg-[#8b8b8b]/10'
                          : 'border-[#8b8b8b]/30'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-[#8b8b8b]" />
                      <span className="text-xs text-[#8b8b8b]">Check</span>
                    </button>
                  </div>

                  {/* CAMPOS DE TEMPO (só aparece se type = timed) */}
                  {addActivityType === 'timed' && (
                    <>
                      <input
                        type="text"
                        value={addActivityTime}
                        onChange={(e) => setAddActivityTime(e.target.value)}
                        placeholder="Tempo gasto (HH:MM)"
                        maxLength={5}
                        className="w-full p-3 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                      />
                      <input
                        type="text"
                        value={addActivityTarget}
                        onChange={(e) => setAddActivityTarget(e.target.value)}
                        placeholder="Meta do dia (opcional, HH:MM)"
                        maxLength={5}
                        className="w-full p-3 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                      />
                    </>
                  )}

                  {/* BOTÕES DE AÇÃO */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowAddActivityModal(false);
                        setAddActivityName('');
                        setAddActivityTime('');
                        setAddActivityTarget('');
                        setAddActivityType('timed');
                        setAddActivityError('');
                      }}
                      disabled={addActivityLoading}
                      className="flex-1 p-3 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all font-medium border border-[#8b8b8b]/30 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddPastActivity}
                      disabled={addActivityLoading}
                      className="flex-1 p-3 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addActivityLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Editar Meta do Dia */}
        <AnimatePresence>
          {showEditTargetModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowEditTargetModal(false)}
            >
              <motion.div
                initial={{ scale: 0.96, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 8 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 p-6"
              >
                <h3 className="text-lg font-bold text-[#8b8b8b] font-cinzel mb-2">Ajustar Meta</h3>
                <p className="text-sm text-[#8b8b8b]/70 mb-4">
                  {editTargetActivity} • {formatDateDisplay(currentDate)}
                </p>

                <input
                  type="text"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(e.target.value)}
                  placeholder="Nova meta (HH:MM)"
                  maxLength={5}
                  className="w-full p-3 mb-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                />

                <p className="text-xs text-[#8b8b8b]/60 mb-6">
                  💡 Esta meta se aplica apenas ao dia {formatDateDisplay(currentDate)}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditTargetModal(false)}
                    disabled={editTargetLoading}
                    className="flex-1 p-3 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all font-medium border border-[#8b8b8b]/30 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveTarget}
                    disabled={editTargetLoading}
                    className="flex-1 p-3 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editTargetLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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

// Componente X (ícone de fechar)
function X({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
