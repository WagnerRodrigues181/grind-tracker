import { useState, useEffect } from 'react';
import { Plus, Loader2, Settings, Clock, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

const getToday = () => new Date().toISOString().split('T')[0];
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function ActivityForm({ onActivityAdded }) {
  const { currentUser } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [activityType, setActivityType] = useState('timed'); // 'timed' ou 'binary'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [customActivities, setCustomActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Carregar atividades personalizadas do Firebase
  useEffect(() => {
    if (!currentUser) return;

    async function loadCustomActivities() {
      try {
        setLoadingActivities(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().customActivities) {
          setCustomActivities(userDoc.data().customActivities);
        } else {
          setCustomActivities([]);
        }
      } catch (err) {
        console.error('Erro ao carregar atividades personalizadas:', err);
        setCustomActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    }

    loadCustomActivities();
  }, [currentUser]);

  // Adicionar atividade personalizada no Firebase
  async function handleAddCustomActivity(name, time, target, type) {
    if (!currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    try {
      const newActivity = { name, time, target, type };
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Verifica se o documento do usuário existe
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Atualiza o array de atividades personalizadas
        await updateDoc(userDocRef, {
          customActivities: arrayUnion(newActivity),
        });
      } else {
        // Cria o documento do usuário com a primeira atividade
        await setDoc(userDocRef, {
          customActivities: [newActivity],
          createdAt: new Date().toISOString(),
        });
      }

      // Atualiza o estado local
      setCustomActivities((prev) => [...prev, newActivity]);
    } catch (err) {
      console.error('Erro ao adicionar atividade personalizada:', err);
      throw err;
    }
  }

  // Remover atividade personalizada do Firebase
  async function handleRemoveCustomActivity(activityToRemove) {
    if (!currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userDocRef, {
        customActivities: arrayRemove(activityToRemove),
      });

      // Atualiza o estado local
      setCustomActivities((prev) =>
        prev.filter(
          (a) =>
            a.name !== activityToRemove.name ||
            a.time !== activityToRemove.time ||
            a.type !== activityToRemove.type
        )
      );
    } catch (err) {
      console.error('Erro ao remover atividade personalizada:', err);
      throw err;
    }
  }

  // Submeter atividade (salvar no documento de activities)
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    const activityName = selectedActivity === 'Outra' ? customActivity : selectedActivity;

    if (!activityName) {
      setError('Selecione ou digite uma atividade');
      return;
    }

    // Para atividades binárias, não preciso validar o tempo
    if (activityType === 'binary') {
      try {
        setLoading(true);

        const today = getToday();
        const activityId = `${currentUser.uid}_${activityName}_${today}`;
        const activityDocRef = doc(db, 'activities', activityId);

        await setDoc(activityDocRef, {
          userId: currentUser.uid,
          activityName: activityName,
          type: 'binary',
          completed: true,
          date: today,
          timestamp: new Date().toISOString(),
        });

        setSuccess('Atividade binária adicionada com sucesso!');
        setSelectedActivity('');
        setCustomActivity('');
        setTime('');
        setTargetTime('');
        if (onActivityAdded) onActivityAdded();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Erro ao adicionar atividade:', err);
        setError('Erro ao adicionar atividade. Tente novamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validação para atividades temporais
    if (!time) {
      setError('Informe o tempo gasto');
      return;
    }
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      setError('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    try {
      setLoading(true);

      const minutes = timeToMinutes(time);
      const targetMinutes = targetTime ? timeToMinutes(targetTime) : null;
      const today = getToday();

      // Gera um ID único para a atividade
      const activityId = `${currentUser.uid}_${activityName}_${Date.now()}`;
      const activityDocRef = doc(db, 'activities', activityId);

      await setDoc(activityDocRef, {
        userId: currentUser.uid,
        activityName: activityName,
        type: 'timed',
        timeSpent: minutes,
        targetTime: targetMinutes,
        date: today,
        timestamp: new Date().toISOString(),
      });

      setSuccess('Atividade adicionada com sucesso!');
      setSelectedActivity('');
      setCustomActivity('');
      setTime('');
      setTargetTime('');
      if (onActivityAdded) onActivityAdded();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao adicionar atividade:', err);
      setError('Erro ao adicionar atividade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectActivity(value) {
    setSelectedActivity(value);
    const found = customActivities.find((a) => a.name === value);
    if (found) {
      setTime(found.time || '');
      setTargetTime(found.target || '');
      setActivityType(found.type || 'timed');
    } else {
      setTime('');
      setTargetTime('');
      setActivityType('timed');
    }
  }

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
        .scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 3px;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: #8b8b8b;
          border-radius: 3px;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: #a0a0a0;
        }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-6 border-2 border-[#8b8b8b]/20">
        <div className="flex justify-between items-center mb-6">
          <h2
            className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
            style={{
              textShadow: '0 0 20px rgba(139, 139, 139, 0.5), 0 0 40px rgba(139, 139, 139, 0.3)',
            }}
          >
            Adicionar Atividade
          </h2>
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="text-sm flex items-center gap-1 text-[#8b8b8b]/70 hover:text-[#8b8b8b] transition"
          >
            <Settings className="w-4 h-4" />
            Gerenciar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">Atividade</label>
            {loadingActivities ? (
              <div className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b]/50 rounded-xl border border-[#8b8b8b]/30 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando atividades...
              </div>
            ) : (
              <select
                value={selectedActivity}
                onChange={(e) => handleSelectActivity(e.target.value)}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                disabled={loading}
              >
                <option value="">Selecione uma atividade</option>
                {customActivities.map((a, idx) => (
                  <option key={`${a.name}-${idx}`} value={a.name}>
                    {a.name} {a.type === 'binary' ? '✓' : '⏱'}
                  </option>
                ))}
                <option value="Outra">Outra (personalizada)</option>
              </select>
            )}
          </div>

          {selectedActivity === 'Outra' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#8b8b8b] mb-1">
                  Nome da Atividade
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome da atividade"
                  value={customActivity}
                  onChange={(e) => setCustomActivity(e.target.value)}
                  className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b8b8b] mb-3">
                  Tipo de Atividade
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActivityType('timed')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      activityType === 'timed'
                        ? 'border-[#8b8b8b] bg-[#8b8b8b]/10'
                        : 'border-[#8b8b8b]/30 bg-[#1a1a1a]'
                    }`}
                  >
                    <Clock className="w-5 h-5 mx-auto mb-2 text-[#8b8b8b]" />
                    <span className="text-sm font-medium text-[#8b8b8b]">Com Tempo</span>
                    <p className="text-xs text-[#8b8b8b]/60 mt-1">Treino, Estudo, etc</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityType('binary')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      activityType === 'binary'
                        ? 'border-[#8b8b8b] bg-[#8b8b8b]/10'
                        : 'border-[#8b8b8b]/30 bg-[#1a1a1a]'
                    }`}
                  >
                    <CheckSquare className="w-5 h-5 mx-auto mb-2 text-[#8b8b8b]" />
                    <span className="text-sm font-medium text-[#8b8b8b]">Check Diário</span>
                    <p className="text-xs text-[#8b8b8b]/60 mt-1">Dieta, Sono, etc</p>
                  </button>
                </div>
              </div>
            </>
          )}

          {activityType === 'timed' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#8b8b8b] mb-1">
                  Tempo Gasto (HH:MM)
                </label>
                <input
                  type="text"
                  placeholder="01:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  disabled={loading}
                  maxLength={5}
                />
                <p className="text-xs text-[#8b8b8b]/60 mt-1">
                  Exemplo: 01:30 (1 hora e 30 minutos)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b8b8b] mb-1">
                  Meta Diária (HH:MM) - Opcional
                </label>
                <input
                  type="text"
                  placeholder="04:00"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  disabled={loading}
                  maxLength={5}
                />
                <p className="text-xs text-[#8b8b8b]/60 mt-1">Ex: 04:00 para meta de 4 horas</p>
              </div>
            </>
          )}

          {activityType === 'binary' && selectedActivity !== '' && (
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Atividade de Check Diário</p>
                  <p className="text-xs text-blue-400/70 mt-1">
                    Esta atividade não mede tempo, apenas marca se foi concluída ou não no dia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-xl text-green-300 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingActivities}
            className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 btn-hover-scale flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {activityType === 'binary' ? 'Marcar como Feito' : 'Adicionar Atividade'}
              </>
            )}
          </button>
        </form>

        {/* MODAL DE GERENCIAR */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 relative max-h-[90vh] overflow-hidden flex flex-col"
              >
                <button
                  onClick={() => setShowMenu(false)}
                  className="absolute top-3 right-3 text-[#8b8b8b]/70 hover:text-[#8b8b8b] text-2xl z-10"
                >
                  ✕
                </button>
                <h3
                  className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel"
                  style={{
                    textShadow: '0 0 15px rgba(139, 139, 139, 0.4)',
                  }}
                >
                  Atividades Personalizadas
                </h3>

                <div className="flex-1 overflow-y-auto scroll-container pr-2 mb-6 space-y-2">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8b8b8b]" />
                    </div>
                  ) : customActivities.length === 0 ? (
                    <p className="text-sm text-[#8b8b8b]/60 text-center py-4">
                      Nenhuma atividade criada.
                    </p>
                  ) : (
                    customActivities.map((a, i) => (
                      <div
                        key={`${a.name}-${i}`}
                        className="flex justify-between items-start gap-3 bg-[#1a1a1a] px-4 py-3 rounded-xl border border-[#8b8b8b]/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#8b8b8b] font-medium">{a.name}</span>
                            {a.type === 'binary' ? (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                ✓ Check
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                                ⏱ Tempo
                              </span>
                            )}
                          </div>
                          {a.type !== 'binary' && (
                            <span className="text-xs text-[#8b8b8b]/60">
                              {a.time}
                              {a.target && ` → Meta: ${a.target}`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await handleRemoveCustomActivity(a);
                            } catch (err) {
                              alert('Erro ao remover atividade. Tente novamente.');
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const name = e.target.name.value.trim();
                    const time = e.target.time.value.trim();
                    const target = e.target.target.value.trim();
                    const type = e.target.type.value;

                    if (!name) return;
                    if (type === 'timed' && !time) {
                      alert('Atividades temporais precisam de um tempo padrão');
                      return;
                    }

                    try {
                      await handleAddCustomActivity(name, time, target, type);
                      e.target.reset();
                    } catch (err) {
                      alert('Erro ao adicionar atividade. Tente novamente.');
                    }
                  }}
                  className="space-y-4 border-t border-[#8b8b8b]/30 pt-6"
                >
                  <input
                    name="name"
                    placeholder="Nome da atividade"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                    required
                  />

                  <select
                    name="type"
                    defaultValue="timed"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  >
                    <option value="timed">⏱ Com Tempo (Treino, Estudo)</option>
                    <option value="binary">✓ Check Diário (Dieta, Sono)</option>
                  </select>

                  <input
                    name="time"
                    placeholder="Tempo padrão (ex: 01:30) - Opcional para binários"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  />
                  <input
                    name="target"
                    placeholder="Meta diária (ex: 04:00) - Opcional"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loadingActivities}
                    className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 btn-hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Adicionar Atividade
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
