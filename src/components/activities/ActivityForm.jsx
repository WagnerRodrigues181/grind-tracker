import { useState } from 'react';
import { Plus, Loader2, Settings, Clock, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext';
import { syncHabitFromActivity } from '../../services/habitsService';
import ManageActivitiesModal from './ManageActivitiesModal';

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function ActivityForm() {
  const { currentUser } = useAuth();
  const { customActivities, loadingCustomActivities, currentDate } = useActivities();

  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [activityType, setActivityType] = useState('timed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

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

  function handleSubmit(e) {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) return setError('Usuário não autenticado');

    const activityName = selectedActivity === 'Outra' ? customActivity : selectedActivity;
    if (!activityName?.trim()) return setError('Selecione ou digite uma atividade');

    if (activityType === 'binary') {
      submitBinaryActivity(activityName);
      return;
    }

    if (!time || !/^([0-9]{1,2}):([0-5][0-9])$/.test(time)) {
      return setError('Tempo inválido (use HH:MM)');
    }

    submitTimedActivity(activityName);
  }

  async function submitBinaryActivity(activityName) {
    try {
      setLoading(true);
      await addDoc(collection(db, 'activities', currentUser.uid, 'entries'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName.trim(),
        type: 'binary',
        completed: true,
        date: currentDate,
        createdAt: serverTimestamp(),
      });

      await syncHabitFromActivity(currentUser.uid, activityName.trim(), currentDate);
      setSuccess('Marcado como feito!');
      resetForm();
    } catch (err) {
      setError('Erro ao marcar atividade');
    } finally {
      setLoading(false);
    }
  }

  async function submitTimedActivity(activityName) {
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
        date: currentDate,
        createdAt: serverTimestamp(),
      });

      await syncHabitFromActivity(currentUser.uid, activityName.trim(), currentDate);
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
    setTimeout(() => setSuccess(''), 3000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .btn-hover-scale { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-hover-scale:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(139, 139, 139, 0.3); }
      `}</style>

      {/* MOBILE: padding menor, título menor */}
      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-4 sm:p-6 border-2 border-[#8b8b8b]/20">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2
            className="text-xl sm:text-2xl font-bold text-[#8b8b8b] font-cinzel"
            style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
          >
            Adicionar Atividade
          </h2>
          <button
            onClick={() => setShowManageModal(true)}
            className="text-sm flex items-center gap-1 text-[#8b8b8b]/70 hover:text-[#8b8b8b] transition-colors touch-target"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Gerenciar</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">Atividade</label>
            {loadingCustomActivities ? (
              <div className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b]/50 rounded-xl border border-[#8b8b8b]/30 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <select
                value={selectedActivity}
                onChange={(e) => handleSelectActivity(e.target.value)}
                className="w-full p-3 sm:p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              >
                <option value="">Selecione uma atividade</option>
                {customActivities.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} {a.type === 'binary' ? '✓ Check' : '⏱ Time'}
                  </option>
                ))}
                <option value="Outra">Outra (personalizada)</option>
              </select>
            )}
          </div>

          {selectedActivity === 'Outra' && (
            <>
              <input
                type="text"
                placeholder="Nome da atividade"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                className="w-full p-3 sm:p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActivityType('timed')}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all touch-target ${activityType === 'timed' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b8b]/30'}`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1 sm:mb-2 text-[#8b8b8b]" />
                  <span className="text-xs sm:text-sm text-[#8b8b8b]">Com Tempo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('binary')}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all touch-target ${activityType === 'binary' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b8b]/30'}`}
                >
                  <CheckSquare className="w-5 h-5 mx-auto mb-1 sm:mb-2 text-[#8b8b8b]" />
                  <span className="text-xs sm:text-sm text-[#8b8b8b]">Check Diário</span>
                </button>
              </div>
            </>
          )}

          {activityType === 'timed' && (
            <>
              <input
                type="text"
                placeholder="Tempo gasto (HH:MM)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                maxLength={5}
                className="w-full p-3 sm:p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Meta diária (opcional)"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                maxLength={5}
                className="w-full p-3 sm:p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
            </>
          )}

          {error && (
            <div className="p-3 sm:p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 sm:p-4 bg-green-900/30 border border-green-600/50 rounded-xl text-green-300 text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || loadingCustomActivities}
            className="w-full p-3 sm:p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold shadow-lg btn-hover-scale flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {activityType === 'binary' ? 'Marcar como Feito' : 'Adicionar'}
              </>
            )}
          </button>
        </div>

        <ManageActivitiesModal isOpen={showManageModal} onClose={() => setShowManageModal(false)} />
      </div>
    </>
  );
}
