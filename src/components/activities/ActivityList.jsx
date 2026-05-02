import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';

import {
  getToday,
  addDays,
  formatDateDisplay,
  isToday,
  isFuture,
} from '../../utils/formatters/dateFormatters';
import {
  timeToMinutes,
  minutesToTime,
  formatDuration,
} from '../../utils/formatters/timeFormatters';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext';
import { useTimer } from '../../contexts/TimerContext';
import { motion, AnimatePresence } from 'framer-motion';
import TimerModal from '../timer/TimerModal';
import { syncHabitFromActivity } from '../../services/habitsService';
import ManageActivitiesModal from './ManageActivitiesModal';

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

import { lazy, Suspense } from 'react';
const ActivityCard = lazy(() => import('./ActivityCard'));
const ActivityModal = lazy(() => import('./ActivityModal'));
const AddActivityModal = lazy(() => import('./AddActivityModal'));
const EditTargetModal = lazy(() => import('./EditTargetModal'));

export default function ActivityList() {
  const { currentUser } = useAuth();
  const { startTimer } = useTimer();

  const {
    dailyActivities,
    loadingDailyActivities,
    customActivities,
    currentDate,
    changeDate,
    totalMinutes,
  } = useActivities();

  const aggregated = useMemo(() => {
    return aggregateActivities(dailyActivities, customActivities, timeToMinutes);
  }, [dailyActivities, customActivities]);

  const [openActivity, setOpenActivity] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [descLoading, setDescLoading] = useState(false);

  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [addActivityName, setAddActivityName] = useState('');
  const [addActivityTime, setAddActivityTime] = useState('');
  const [addActivityTarget, setAddActivityTarget] = useState('');
  const [addActivityType, setAddActivityType] = useState('timed');
  const [addActivityLoading, setAddActivityLoading] = useState(false);
  const [addActivityError, setAddActivityError] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [showEditTargetModal, setShowEditTargetModal] = useState(false);
  const [editTargetActivity, setEditTargetActivity] = useState(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editTargetLoading, setEditTargetLoading] = useState(false);

  const [showManageModal, setShowManageModal] = useState(false);

  const userId = useMemo(() => currentUser?.uid, [currentUser?.uid]);

  const handlePreviousDay = useCallback(() => {
    changeDate(addDays(currentDate, -1));
  }, [changeDate, currentDate]);

  const handleNextDay = useCallback(() => {
    if (!isFuture(addDays(currentDate, 1))) {
      changeDate(addDays(currentDate, 1));
    }
  }, [changeDate, currentDate]);

  const handleToday = useCallback(() => {
    changeDate(getToday());
  }, [changeDate]);

  const handleAdjustTime = useCallback(
    async (activityName, minutesDelta) => {
      await adjustActivityTime(
        activityName,
        minutesDelta,
        aggregated,
        userId,
        currentUser,
        currentDate
      );
    },
    [aggregated, userId, currentUser, currentDate]
  );

  const handleDeleteAll = useCallback(
    async (activityName) => {
      if (
        !confirm(
          `Remover TODAS as entradas de "${activityName}" em ${formatDateDisplay(currentDate)}?`
        )
      ) {
        return;
      }
      await deleteAllActivityEntries(activityName, aggregated, userId);
    },
    [aggregated, userId, currentDate]
  );

  const openActivityModal = useCallback(
    async (name) => {
      const image = getActivityImage(name);
      const data = aggregated[name];
      const desc = await fetchActivityDescription(userId, currentDate, name);
      setDescriptionText(desc);
      setOpenActivity({ name, image, data, description: desc });
    },
    [aggregated, userId, currentDate]
  );

  const closeActivityModal = useCallback(() => {
    setOpenActivity(null);
    setDescriptionText('');
    document.body.style.overflow = '';
  }, []);

  const handleSaveDescription = useCallback(async () => {
    try {
      setDescLoading(true);
      await saveActivityDescription(userId, currentDate, openActivity.name, descriptionText);
      closeActivityModal();
    } catch (err) {
      alert('Erro ao salvar descrição. Tente novamente.');
    } finally {
      setDescLoading(false);
    }
  }, [userId, currentDate, openActivity, descriptionText, closeActivityModal]);

  const handleDeleteDescription = useCallback(async () => {
    if (!confirm('Remover descrição desta atividade?')) return;
    try {
      await deleteActivityDescription(userId, currentDate, openActivity.name);
      setDescriptionText('');
      closeActivityModal();
    } catch (err) {
      console.error('Erro ao remover descrição:', err);
    }
  }, [userId, currentDate, openActivity, closeActivityModal]);

  const handleStartTimer = useCallback((activityName) => {
    setSelectedActivity(activityName);
    setShowTimerModal(true);
  }, []);

  const handleTimerComplete = useCallback(
    async (activityName, totalSeconds) => {
      await saveTimerActivity(activityName, totalSeconds, userId, currentUser.email, currentDate);
    },
    [userId, currentUser, currentDate]
  );

  const handleTimerStart = useCallback(
    (hours, minutes, seconds) => {
      startTimer(selectedActivity, hours, minutes, seconds, (totalSeconds) => {
        handleTimerComplete(selectedActivity, totalSeconds);
      });
    },
    [selectedActivity, startTimer, handleTimerComplete]
  );

  const handleAddPastActivity = useCallback(
    async (activityData) => {
      setAddActivityError('');

      const activityName = activityData.name?.trim();
      const addActivityType = activityData.type;
      const addActivityTime = activityData.time;
      const addActivityTarget = activityData.target;

      if (!activityName) {
        throw new Error('Digite o nome da atividade');
      }

      if (addActivityType === 'timed') {
        const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

        if (!addActivityTime || !timeRegex.test(addActivityTime)) {
          throw new Error('Tempo inválido (use HH:MM)');
        }

        if (addActivityTarget && !timeRegex.test(addActivityTarget)) {
          throw new Error('Meta inválida (use HH:MM)');
        }
      }

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
          targetMinutes, // Mantém compatibilidade
          target: targetMinutes, // Campo adicional para garantir leitura
          date: currentDate,
          createdAt: serverTimestamp(),
        });
      }

      await syncHabitFromActivity(userId, activityName, currentDate);
    },
    [userId, currentUser, currentDate]
  );

  const handleOpenEditTarget = useCallback(
    (activityName) => {
      const data = aggregated[activityName];
      setEditTargetActivity(activityName);
      setEditTargetValue(data.target ? minutesToTime(data.target) : '');
      setShowEditTargetModal(true);
    },
    [aggregated]
  );

  const handleSaveTarget = useCallback(async () => {
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

    if (editTargetValue && !timeRegex.test(editTargetValue)) {
      alert('Formato inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    try {
      setEditTargetLoading(true);
      const newTargetMinutes = editTargetValue ? timeToMinutes(editTargetValue) : null;

      const entries = aggregated[editTargetActivity]?.entries || [];

      if (entries.length === 0) {
        alert('Nenhuma entrada encontrada para esta atividade no dia atual.');
        return;
      }

      // Atualiza todas as entradas do dia para esta atividade
      await Promise.all(
        entries.map((entry) =>
          setDoc(
            doc(db, 'activities', userId, 'entries', entry.id),
            {
              targetMinutes: newTargetMinutes,
              target: newTargetMinutes, // Campo adicional para garantir leitura
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );

      setShowEditTargetModal(false);
      setEditTargetActivity(null);
      setEditTargetValue('');

      // Pequeno delay para garantir que o snapshot seja processado
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      alert('Erro ao salvar meta. Tente novamente.');
    } finally {
      setEditTargetLoading(false);
    }
  }, [editTargetValue, aggregated, editTargetActivity, userId]);

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
  }, [openActivity, closeActivityModal]);

  const currentDateInfo = useMemo(
    () => ({
      isToday: isToday(currentDate),
      displayDate: formatDateDisplay(currentDate),
      canGoNext: !isFuture(addDays(currentDate, 1)),
    }),
    [currentDate]
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        
        .activity-container {
          min-height: 500px;
          position: relative;
        }
        
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
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
        
        .activity-card {
          transform: translateZ(0);
          backface-visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          will-change: transform;
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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h2
                className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
                style={{ textShadow: '0 0 20px rgba(139, 139, 139, 0.5)' }}
              >
                {currentDateInfo.isToday ? 'Atividades de Hoje' : currentDateInfo.displayDate}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#8b8b8b]" />
                </button>
                {!currentDateInfo.isToday && (
                  <button
                    onClick={handleToday}
                    className="px-3 py-1 text-xs bg-[#8b8b8b]/10 text-[#8b8b8b] rounded-lg hover:bg-[#8b8b8b]/20 transition-colors"
                  >
                    Hoje
                  </button>
                )}
                <button
                  onClick={handleNextDay}
                  disabled={!currentDateInfo.canGoNext}
                  className="p-1.5 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-[#8b8b8b]" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowManageModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 hover:shadow-lg group"
                title="Gerenciar atividades predefinidas"
              >
                <Settings className="w-4 h-4 text-[#8b8b8b] group-hover:rotate-12 transition-transform" />
                <span className="text-sm text-[#8b8b8b] hidden sm:inline">Gerenciar</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#8b8b8b]/10 rounded-lg">
                <Clock className="w-5 h-5 text-[#8b8b8b]" />
                <span className="text-base font-bold text-[#8b8b8b]">
                  {formatDuration(totalMinutes)}
                </span>
              </div>
            </div>
          </div>

          {loadingDailyActivities ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8b8b8b]"></div>
            </div>
          ) : (
            <div className="activity-grid">
              <Suspense
                fallback={<div className="h-48 bg-[#1e1e1e]/50 rounded-xl animate-pulse" />}
              >
                <AnimatePresence mode="popLayout">
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

                  {Object.entries(aggregated).map(([name, data]) => (
                    <ActivityCard
                      key={name}
                      name={name}
                      data={data}
                      isToday={currentDateInfo.isToday}
                      onOpenModal={openActivityModal}
                      onOpenEditTarget={handleOpenEditTarget}
                      onAdjustTime={handleAdjustTime}
                      onStartTimer={handleStartTimer}
                      onDeleteAll={handleDeleteAll}
                    />
                  ))}
                </AnimatePresence>
              </Suspense>
            </div>
          )}
        </div>

        <Suspense fallback={null}>
          {openActivity && (
            <ActivityModal
              activity={openActivity}
              onClose={closeActivityModal}
              onSave={handleSaveDescription}
              onDelete={handleDeleteDescription}
              loading={descLoading}
            />
          )}

          {showAddActivityModal && (
            <AddActivityModal
              isOpen={showAddActivityModal}
              onClose={() => setShowAddActivityModal(false)}
              onAdd={handleAddPastActivity}
              customActivities={customActivities}
              currentDate={currentDate}
              formatDateDisplay={formatDateDisplay}
            />
          )}

          {showEditTargetModal && (
            <EditTargetModal
              isOpen={showEditTargetModal}
              onClose={() => setShowEditTargetModal(false)}
              onSave={handleSaveTarget}
              activityName={editTargetActivity}
              currentTarget={editTargetValue}
              currentDate={currentDate}
              formatDateDisplay={formatDateDisplay}
            />
          )}

          <TimerModal
            isOpen={showTimerModal}
            onClose={() => setShowTimerModal(false)}
            activityName={selectedActivity}
            onStart={handleTimerStart}
          />

          <ManageActivitiesModal
            isOpen={showManageModal}
            onClose={() => setShowManageModal(false)}
          />
        </Suspense>
      </div>
    </>
  );
}
