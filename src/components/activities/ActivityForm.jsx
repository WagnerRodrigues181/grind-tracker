import { useState, useEffect } from 'react';
import { Plus, Loader2, Settings } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { getToday, timeToMinutes } from '../../utils/dateHelpers';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityForm({ onActivityAdded }) {
  const { currentUser } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [customActivities, setCustomActivities] = useState([]);

  useEffect(() => {
    const handleUpdate = () => {
      setCustomActivities(JSON.parse(localStorage.getItem('customActivities') || '[]'));
    };

    window.addEventListener('customActivitiesUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('customActivitiesUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  function handleAddCustomActivity(name, time, target) {
    const updated = [...customActivities, { name, time, target }];
    setCustomActivities(updated);
    localStorage.setItem('customActivities', JSON.stringify(updated));
    window.dispatchEvent(new Event('customActivitiesUpdated'));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const activityName = selectedActivity === 'Outra' ? customActivity : selectedActivity;

    if (!activityName) {
      setError('Selecione ou digite uma atividade');
      return;
    }
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
      console.log('🔥 SALVANDO ATIVIDADE PARA UID:', currentUser.uid);
      console.log('Coleção:', `activities/${currentUser.uid}/entries`);

      const minutes = timeToMinutes(time);
      const targetMinutes = targetTime ? timeToMinutes(targetTime) : null;

      // SALVA NA SUBCOLEÇÃO DO USUÁRIO (CORRETO)
      await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
        activity: activityName,
        minutes,
        targetMinutes,
        date: getToday(),
        createdAt: serverTimestamp(),
        userEmail: currentUser.email,
        userId: currentUser.uid,
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
      setTime(found.time);
      setTargetTime(found.target || '');
    } else {
      setTime('');
      setTargetTime('');
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
            className="text-sm flex items-center gap-1 text-[#8b8b8b]/70 hover:text-[#8b8b8b]² transition"
          >
            <Settings className="w-4 h-4" />
            Gerenciar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">Atividade</label>
            <select
              value={selectedActivity}
              onChange={(e) => handleSelectActivity(e.target.value)}
              className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
              disabled={loading}
            >
              <option value="">Selecione uma atividade</option>
              {customActivities.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
              <option value="Outra">Outra (personalizada)</option>
            </select>
          </div>

          {selectedActivity === 'Outra' && (
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
          )}

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
            <p className="text-xs text-[#8b8b8b]/60 mt-1">Exemplo: 01:30 (1 hora e 30 minutos)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">
              Meta Diária (HH:MM)
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
            disabled={loading}
            className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 btn-hover-scale flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Adicionar Atividade
              </>
            )}
          </button>
        </form>

        {/* MODAL DE GERENCIAR COM MESMA ESTÉTICA DO HABITSTABLE */}
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
                className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 relative"
              >
                <button
                  onClick={() => setShowMenu(false)}
                  className="absolute top-3 right-3 text-[#8b8b8b]/70 hover:text-[#8b8b8b] text-2xl"
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

                <div className="max-h-60 overflow-y-auto mb-6 space-y-2">
                  {customActivities.length === 0 ? (
                    <p className="text-sm text-[#8b8b8b]/60 text-center py-4">
                      Nenhuma atividade criada.
                    </p>
                  ) : (
                    customActivities.map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-[#1a1a1a] px-4 py-3 rounded-xl border border-[#8b8b8b]/30"
                      >
                        <span className="text-[#8b8b8b]">
                          {a.name} — <span className="text-[#8b8b8b]/60">{a.time}</span>
                          {a.target && ` → ${a.target}`}
                        </span>
                        <button
                          onClick={() => {
                            const updated = customActivities.filter((_, idx) => idx !== i);
                            setCustomActivities(updated);
                            localStorage.setItem('customActivities', JSON.stringify(updated));
                            window.dispatchEvent(new Event('customActivitiesUpdated'));
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
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
                    if (!name || !time) return;
                    handleAddCustomActivity(name, time, target);
                    e.target.reset();
                  }}
                  className="space-y-4"
                >
                  <input
                    name="name"
                    placeholder="Nome da atividade"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  />
                  <input
                    name="time"
                    placeholder="Tempo padrão (ex: 01:30)"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  />
                  <input
                    name="target"
                    placeholder="Meta diária (ex: 04:00)"
                    className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 btn-hover-scale"
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
