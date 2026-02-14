import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addHabit } from '../../services/habitsService';
import { addCustomActivityTemplate } from '../../services/activitiesService';

/**
 * Modal para adicionar novo hábito
 */
export default function AddHabitModal({
  isOpen,
  onClose,
  userId,
  availableActivities,
  loadingActivities,
  onHabitAdded,
}) {
  const [showPredefinedSelect, setShowPredefinedSelect] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDuration, setNewHabitDuration] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [error, setError] = useState('');

  async function handleAddHabitFromPredefined(activity) {
    try {
      await addHabit(userId, activity.name, activity.time || '00:30');
      setShowPredefinedSelect(false);
      onClose();
      setError('');
      if (onHabitAdded) onHabitAdded();
    } catch (error) {
      console.error('Erro ao adicionar hábito:', error);
      setError(error.message);
    }
  }

  async function handleAddHabit() {
    if (!newHabitName.trim()) {
      setError('Digite um nome para o hábito');
      return;
    }

    if (!newHabitDuration.trim()) {
      setError('Digite uma duração padrão (ex: 01:30)');
      return;
    }

    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (!timeRegex.test(newHabitDuration)) {
      setError('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    if (newHabitTarget.trim() && !timeRegex.test(newHabitTarget)) {
      setError('Formato de meta inválido. Use HH:MM (ex: 04:00)');
      return;
    }

    try {
      await addHabit(userId, newHabitName.trim(), newHabitDuration.trim());

      await addCustomActivityTemplate(userId, {
        name: newHabitName.trim(),
        type: 'timed',
        time: newHabitDuration.trim(),
        target: newHabitTarget.trim() || '',
      });

      setNewHabitName('');
      setNewHabitDuration('');
      setNewHabitTarget('');
      onClose();
      setShowPredefinedSelect(false);
      setError('');
      if (onHabitAdded) onHabitAdded();
    } catch (error) {
      console.error('Erro ao adicionar hábito:', error);
      setError(error.message);
    }
  }

  function handleClose() {
    setShowPredefinedSelect(false);
    setNewHabitName('');
    setNewHabitDuration('');
    setNewHabitTarget('');
    setError('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 relative"
        >
          <h3
            className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel"
            style={{ textShadow: '0 0 15px rgba(139,139,139,0.4)' }}
          >
            Adicionar Novo Hábito
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {!showPredefinedSelect ? (
            <>
              <button
                onClick={() => setShowPredefinedSelect(true)}
                className="w-full mb-6 p-4 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
              >
                Escolher de Atividades Pré-definidas
              </button>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-[#8b8b8b]/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 py-1 bg-[#252525] text-[#8b8b8b]/70 rounded-full border border-[#8b8b8b]/20">
                    ou
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Nome do hábito"
                className="w-full mb-4 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
              />
              <input
                type="text"
                value={newHabitDuration}
                onChange={(e) => setNewHabitDuration(e.target.value)}
                placeholder="Duração padrão (ex: 01:30)"
                className="w-full mb-4 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                maxLength={5}
              />
              <input
                type="text"
                value={newHabitTarget}
                onChange={(e) => setNewHabitTarget(e.target.value)}
                placeholder="Meta diária (ex: 04:00) - opcional"
                className="w-full mb-6 p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]/20 transition-all"
                maxLength={5}
              />
              <div className="flex gap-4">
                <button
                  onClick={handleClose}
                  className="flex-1 p-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddHabit}
                  className="flex-1 p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40"
                >
                  Adicionar
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowPredefinedSelect(false)}
                className="mb-4 text-sm text-[#8b8b8b]/70 hover:text-[#8b8b8b] transition-colors flex items-center gap-2"
              >
                ← Voltar
              </button>

              <div
                className="max-h-80 overflow-y-auto mb-6 space-y-2 scroll-container pr-3 pt-2 pb-4"
                style={{ scrollBehavior: 'smooth' }}
              >
                {loadingActivities ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8b8b8b]" />
                  </div>
                ) : availableActivities.length === 0 ? (
                  <p className="text-sm text-[#8b8b8b]/60 text-center py-8">
                    Nenhuma atividade pré-definida cadastrada.
                  </p>
                ) : (
                  availableActivities.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => handleAddHabitFromPredefined(activity)}
                      className="activity-card w-full p-3 bg-[#1a1a1a] rounded-xl text-left border border-[#8b8b8b]/30 flex flex-col group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#8b8b8b] group-hover:text-[#a0a0a0] transition-colors">
                          {activity.name}
                        </span>
                        {activity.type === 'binary' ? (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            ✓ Check
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                            ⏱ Tempo
                          </span>
                        )}
                      </div>
                      {activity.type !== 'binary' && (
                        <div className="text-xs text-[#8b8b8b]/60 group-hover:text-[#8b8b8b]/80 transition-colors">
                          Duração: {activity.time || '00:30'}
                          {activity.target && ` → Meta: ${activity.target}`}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full p-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50"
              >
                Cancelar
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
