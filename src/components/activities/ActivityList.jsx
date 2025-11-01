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
    // PREVENIR LAYOUT SHIFT: usar classe no body
    document.body.classList.add('modal-open');
  }

  function closeActivityModal() {
    setOpenActivity(null);
    setDescriptionText('');
    document.body.classList.remove('modal-open');
  }

  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>
      </div>
    );
  }

  return (
    <div className="card relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-primary-accent">
            {isToday(currentDate) ? 'Atividades de Hoje' : formatDateDisplay(currentDate)}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousDay}
              className="p-1.5 hover:bg-primary-third rounded-lg transition"
              title="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5 text-primary-accent" />
            </button>
            {!isToday(currentDate) && (
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs bg-primary-third text-primary-first rounded-lg hover:bg-primary-accent transition"
              >
                Hoje
              </button>
            )}
            <button
              onClick={handleNextDay}
              disabled={isFuture(addDays(currentDate, 1))}
              className="p-1.5 hover:bg-primary-third rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Próximo dia"
            >
              <ChevronRight className="w-5 h-5 text-primary-accent" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-third rounded-lg">
            <Clock className="w-5 h-5 text-primary-first" />
            <span className="text-base font-bold text-primary-first">
              {formatDuration(totalMinutes)}
            </span>
          </div>
        </div>
      </div>

      {Object.keys(aggregated).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-primary-accent mb-2">Nenhuma atividade neste dia</p>
          <p className="text-sm text-primary-accent/70">Adicione sua primeira atividade acima!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(aggregated).map(([name, data]) => {
            const progress = data.target ? (data.total / data.target) * 100 : 0;
            const isComplete = progress >= 100;
            const activityImage = getActivityImage(name);

            return (
              <div
                key={name}
                className="group relative flex items-center gap-4 p-4 bg-primary-second rounded-xl border border-primary-accent hover:border-primary-third hover:shadow-md transition-all duration-200"
              >
                <button
                  onClick={() => openActivityModal(name)}
                  className="flex-shrink-0 w-44 h-44 rounded-xl overflow-hidden bg-gradient-to-br from-primary-third to-primary-accent flex items-center justify-center p-0 border-none"
                  title={`Abrir detalhes de ${name}`}
                >
                  {activityImage ? (
                    <img src={activityImage} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">Document</span>
                  )}
                </button>

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

                  <div className="mt-2 w-full bg-primary-first rounded-full h-3 overflow-hidden relative">
                    <div
                      className={`absolute inset-0 h-full ${
                        isComplete ? 'bg-white' : 'bg-primary-third'
                      } rounded-full transition-all duration-700 ease-in-out`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                    {!isComplete && (
                      <div className="absolute inset-0">
                        <div
                          className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-breathing"
                          style={{
                            animation: 'breathing 4бур 4s ease-in-out infinite',
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
                    {isComplete
                      ? 'Meta batida!'
                      : data.target
                        ? `${data.target - data.total}min restantes`
                        : ''}
                  </p>

                  {isToday(currentDate) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAdjustTime(name, -30)}
                        className="flex-1 min-w-[48px] px-2 py-1 text-xs bg-red- | 900/30 text-red-400 rounded-md hover:bg-red-900/50 transition"
                      >
                        −30min
                      </button>

                      {!isComplete && (
                        <>
                          {[30, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleAdjustTime(name, mins)}
                              className="flex-1 min-w-[48px] px-2 py-1 text-xs bg-primary-third text-primary-first rounded-md hover:bg-primary-accent transition"
                            >
                              +{mins === 60 ? '1h' : `${mins}min`}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
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

      {/* MODAL CORRIGIDO: sem tremor, blur imediato, zoom limpo */}
      <AnimatePresence>
        {openActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
            style={{ backdropFilter: 'blur(4px)' }} // blur imediato
          >
            {/* Overlay com blur instantâneo */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeActivityModal}
              style={{ backdropFilter: 'blur(4px)' }}
            />

            {/* Card com GPU + transform-origin */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-3xl mx-4"
              style={{
                transformOrigin: 'center',
                willChange: 'transform, opacity',
              }}
            >
              <div className="bg-primary-second rounded-2xl shadow-2xl p-4 md:p-6 border border-primary-accent text-primary-accent">
                <button
                  onClick={closeActivityModal}
                  className="absolute top-3 right-3 text-primary-accent/70 hover:text-primary-accent transition"
                >
                  ✕
                </button>

                <div className="md:flex md:gap-6 items-start">
                  <div className="w-full md:w-1/3 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary-third to-primary-accent">
                    {openActivity.image ? (
                      <img
                        src={openActivity.image}
                        alt={openActivity.name}
                        className="w-full h-56 md:h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-56 md:h-64 flex items-center justify-center text-6xl">
                        Document
                      </div>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0 md:flex-1">
                    <h3 className="text-2xl font-bold text-primary-accent">{openActivity.name}</h3>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-third rounded-lg">
                        <Clock className="w-5 h-5 text-primary-first" />
                        <span className="text-sm font-bold text-primary-first">
                          {formatDuration(openActivity.data?.total || 0)}
                        </span>
                      </div>

                      {openActivity.data?.target && (
                        <div className="text-sm text-primary-accent/70">
                          Meta: {formatDuration(openActivity.data.target)}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-primary-accent mb-2">
                        Descrição do dia
                      </label>
                      <textarea
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                        rows={6}
                        placeholder="Descreva como foi o treino, notas, observações..."
                        className="w-full resize-y p-3 rounded-lg bg-primary-first text-primary-accent border border-primary-accent/30 focus:border-primary-accent outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={async () => {
                          try {
                            setDescLoading(true);
                            await saveDescription(openActivity.name, descriptionText);
                            setDescLoading(false);
                            closeActivityModal();
                          } catch (err) {
                            setDescLoading(false);
                            alert('Erro ao salvar descrição. Tente novamente.');
                            console.error(err);
                          }
                        }}
                        className="btn-primary"
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
                        className="px-3 py-2 rounded-md bg-red-900/20 text-red-400 hover:bg-red-900/40 transition"
                      >
                        Remover
                      </button>

                      <button
                        onClick={closeActivityModal}
                        className="px-3 py-2 rounded-md bg-primary-third text-primary-first hover:bg-primary-accent transition ml-auto"
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

      {/* CSS GLOBAL: prevenir layout shift */}
      <style jsx global>{`
        body.modal-open {
          overflow: hidden;
          padding-right: 0 !important; /* evita salto */
        }
        /* Força GPU no modal */
        .modal-open * {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
