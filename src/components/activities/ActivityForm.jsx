import { useState } from 'react';
import { Plus, Loader2, Settings, Clock, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  addCustomActivityTemplate,
  deleteCustomActivityTemplate,
} from '../../services/activitiesService';

const getToday = () => new Date().toISOString().split('T')[0];
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function ActivityForm({
  onActivityAdded,
  customActivities = [], // ← vem do Dashboard
  loadingActivities = false, // ← vem do Dashboard
}) {
  const { currentUser } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [activityType, setActivityType] = useState('timed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // === SELECIONA TEMPO/META AUTOMÁTICO ===
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

  // === SUBMISSÃO ===
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) return setError('Usuário não autenticado');

    const activityName = selectedActivity === 'Outra' ? customActivity : selectedActivity;
    if (!activityName?.trim()) return setError('Selecione ou digite uma atividade');

    // BINÁRIO
    if (activityType === 'binary') {
      try {
        setLoading(true);
        await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          activity: activityName.trim(),
          type: 'binary',
          completed: true,
          date: getToday(),
          createdAt: serverTimestamp(),
        });
        setSuccess('Marcado como feito!');
        resetForm();
      } catch (err) {
        setError('Erro ao marcar atividade');
      } finally {
        setLoading(false);
      }
      return;
    }

    // TIMED
    if (!time || !/^([0-9]{1,2}):([0-5][0-9])$/.test(time)) {
      return setError('Tempo inválido (use HH:MM)');
    }

    try {
      setLoading(true);
      const minutes = timeToMinutes(time);
      const targetMinutes = targetTime ? timeToMinutes(targetTime) : null;

      await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName.trim(),
        type: 'timed',
        minutes,
        targetMinutes,
        date: getToday(),
        createdAt: serverTimestamp(),
      });

      setSuccess('Atividade adicionada!');
      resetForm();
    } catch (err) {
      setError('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedActivity('');
    setCustomActivity('');
    setTime('');
    setTargetTime('');
    setActivityType('timed');
    if (onActivityAdded) onActivityAdded();
    setTimeout(() => setSuccess(''), 3000);
  }

  // === ADICIONAR/REMOVER TEMPLATE ===
  async function handleAddCustom(name, time, target, type) {
    if (!name.trim()) return;
    try {
      await addCustomActivityTemplate(currentUser.uid, { name: name.trim(), type, time, target });
    } catch (e) {
      alert('Erro ao salvar template');
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remover essa atividade personalizada?')) return;
    try {
      await deleteCustomActivityTemplate(currentUser.uid, id);
    } catch (e) {
      alert('Erro ao remover');
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .btn-hover-scale { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-hover-scale:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(139, 139, 139, 0.3); }
        .scroll-container::-webkit-scrollbar { width: 6px; }
        .scroll-container::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 3px; }
        .scroll-container::-webkit-scrollbar-thumb { background: #8b8b8b; border-radius: 3px; }
        .scroll-container::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-6 border-2 border-[#8b8b8b]/20">
        <div className="flex justify-between items-center mb-6">
          <h2
            className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
            style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
          >
            Adicionar Atividade
          </h2>
          <button
            onClick={() => setShowMenu(true)}
            className="text-sm flex items-center gap-1 text-[#8b8b8b]/70 hover:text-[#8b8b8b]"
          >
            <Settings className="w-4 h-4" /> Gerenciar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SELECT DE ATIVIDADES */}
          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">Atividade</label>
            {loadingActivities ? (
              <div className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b]/50 rounded-xl border border-[#8b8b8b]/30 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <select
                value={selectedActivity}
                onChange={(e) => handleSelectActivity(e.target.value)}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              >
                <option value="">Selecione uma atividade</option>
                {customActivities.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} {a.type === 'binary' ? 'Check' : 'Time'}
                  </option>
                ))}
                <option value="Outra">Outra (personalizada)</option>
              </select>
            )}
          </div>

          {/* CAMPO "OUTRA" */}
          {selectedActivity === 'Outra' && (
            <>
              <input
                type="text"
                placeholder="Nome da atividade"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b]"
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActivityType('timed')}
                  className={`p-4 rounded-xl border-2 ${activityType === 'timed' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b8b]/30'}`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-2" />{' '}
                  <span className="text-sm">Com Tempo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('binary')}
                  className={`p-4 rounded-xl border-2 ${activityType === 'binary' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b]/30'}`}
                >
                  <CheckSquare className="w-5 h-5 mx-auto mb-2" />{' '}
                  <span className="text-sm">Check Diário</span>
                </button>
              </div>
            </>
          )}

          {/* TEMPO (apenas timed) */}
          {activityType === 'timed' && (
            <>
              <input
                type="text"
                placeholder="Tempo gasto (HH:MM)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                maxLength={5}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b]"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Meta diária (opcional)"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                maxLength={5}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b]"
                disabled={loading}
              />
            </>
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
            className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold shadow-lg btn-hover-scale flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />{' '}
                {activityType === 'binary' ? 'Marcar como Feito' : 'Adicionar'}
              </>
            )}
          </button>
        </form>

        {/* MODAL GERENCIAR */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <button
                  onClick={() => setShowMenu(false)}
                  className="absolute top-3 right-3 text-2xl"
                >
                  X
                </button>
                <h3 className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel">
                  Atividades Personalizadas
                </h3>

                <div className="space-y-3 mb-6">
                  {loadingActivities ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : customActivities.length === 0 ? (
                    <p className="text-center text-[#8b8b8b]/60">Nenhuma atividade</p>
                  ) : (
                    customActivities.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#8b8b8b]/30"
                      >
                        <div>
                          <span className="font-medium">{a.name}</span>
                          {a.type === 'binary' ? (
                            <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                              Check
                            </span>
                          ) : (
                            <span className="ml-2 text-xs text-[#8b8b8b]/60">
                              {a.time}
                              {a.target && ` → ${a.target}`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(a.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = e.target.name.value.trim();
                    const time = e.target.time.value.trim();
                    const target = e.target.target.value.trim();
                    const type = e.target.type.value;
                    if (!name) return;
                    handleAddCustom(name, time, target, type);
                    e.target.reset();
                  }}
                  className="space-y-4 border-t border-[#8b8b8b]/30 pt-6"
                >
                  <input
                    name="name"
                    placeholder="Nome"
                    required
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30"
                  />
                  <select
                    name="type"
                    defaultValue="timed"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30"
                  >
                    <option value="timed">Time (Treino, Estudo)</option>
                    <option value="binary">Check (Dieta, Sono)</option>
                  </select>
                  <input
                    name="time"
                    placeholder="Tempo padrão (ex: 01:30)"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30"
                  />
                  <input
                    name="target"
                    placeholder="Meta (ex: 04:00)"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30"
                  />
                  <button
                    type="submit"
                    className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold"
                  >
                    Adicionar
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
