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

  // ESCUTA ATUALIZAÇÕES NO localStorage E EVENTO CUSTOMIZADO
  useEffect(() => {
    const handleUpdate = () => {
      setCustomActivities(JSON.parse(localStorage.getItem('customActivities') || '[]'));
    };

    window.addEventListener('customActivitiesUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    handleUpdate(); // inicial

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
      const minutes = timeToMinutes(time);
      const targetMinutes = targetTime ? timeToMinutes(targetTime) : null;

      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName,
        minutes,
        targetMinutes,
        date: getToday(),
        createdAt: serverTimestamp(),
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
    <div className="card relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-primary-accent">Adicionar Atividade</h2>
        <button
          type="button"
          onClick={() => setShowMenu(true)}
          className="text-sm flex items-center gap-1 text-primary-accent/70 hover:text-primary-accent transition"
        >
          <Settings className="w-4 h-4" />
          Gerenciar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-accent mb-1">Atividade</label>
          <select
            value={selectedActivity}
            onChange={(e) => handleSelectActivity(e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value="">Selecione uma atividade</option>
            {[...customActivities.map((a) => a.name)].map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
            <option value="Outra">Outra (personalizada)</option>
          </select>
        </div>

        {selectedActivity === 'Outra' && (
          <div>
            <label className="block text-sm font-medium text-primary-accent mb-1">
              Nome da Atividade
            </label>
            <input
              type="text"
              placeholder="Digite o nome da atividade"
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-primary-accent mb-1">
            Tempo Gasto (HH:MM)
          </label>
          <input
            type="text"
            placeholder="01:30"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input-field"
            disabled={loading}
            maxLength={5}
          />
          <p className="text-xs text-primary-accent/60 mt-1">
            Exemplo: 01:30 (1 hora e 30 minutos)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-accent mb-1">
            Meta Diária (HH:MM)
          </label>
          <input
            type="text"
            placeholder="04:00"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="input-field"
            disabled={loading}
            maxLength={5}
          />
          <p className="text-xs text-primary-accent/60 mt-1">Ex: 04:00 para meta de 4 horas</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 text-green-400 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
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

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-primary-first/80 flex items-center justify-center z-50 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-primary-second rounded-2xl shadow-2xl p-6 w-full max-w-md relative text-primary-third border border-primary-accent"
            >
              <button
                onClick={() => setShowMenu(false)}
                className="absolute top-3 right-3 text-primary-accent/70 hover:text-primary-accent"
              >
                ✕
              </button>
              <h3 className="text-lg font-semibold mb-3 text-primary-accent">
                Atividades Personalizadas
              </h3>
              <div className="max-h-60 overflow-y-auto mb-4 space-y-2">
                {customActivities.length === 0 ? (
                  <p className="text-sm text-primary-accent/60">Nenhuma atividade criada.</p>
                ) : (
                  customActivities.map((a, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-primary-first px-3 py-2 rounded-lg"
                    >
                      <span>
                        {a.name} — <span className="text-primary-accent/60">{a.time}</span>
                        {a.target && ` → ${a.target}`}
                      </span>
                      <button
                        onClick={() => {
                          const updated = customActivities.filter((_, idx) => idx !== i);
                          setCustomActivities(updated);
                          localStorage.setItem('customActivities', JSON.stringify(updated));
                          window.dispatchEvent(new Event('customActivitiesUpdated'));
                        }}
                        className="text-xs text-red-500 hover:text-red-400"
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
                className="space-y-3"
              >
                <input name="name" placeholder="Nome da atividade" className="input-field" />
                <input name="time" placeholder="Tempo padrão (ex: 01:30)" className="input-field" />
                <input
                  name="target"
                  placeholder="Meta diária (ex: 04:00)"
                  className="input-field"
                />
                <button type="submit" className="btn-primary w-full">
                  Adicionar Atividade
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
