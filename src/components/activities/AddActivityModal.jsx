import { useState } from 'react';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal para adicionar atividade em dias anteriores
 */
export default function AddActivityModal({
  isOpen,
  onClose,
  onAdd,
  customActivities,
  currentDate,
  formatDateDisplay,
}) {
  const [addActivityName, setAddActivityName] = useState('');
  const [addActivityTime, setAddActivityTime] = useState('');
  const [addActivityTarget, setAddActivityTarget] = useState('');
  const [addActivityType, setAddActivityType] = useState('timed');
  const [addActivityLoading, setAddActivityLoading] = useState(false);
  const [addActivityError, setAddActivityError] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  async function handleSubmit() {
    setAddActivityError('');
    setAddActivityLoading(true);

    try {
      await onAdd({
        name: addActivityName,
        time: addActivityTime,
        target: addActivityTarget,
        type: addActivityType,
      });

      // Reset
      setAddActivityName('');
      setAddActivityTime('');
      setAddActivityTarget('');
      setAddActivityType('timed');
      setIsCustomMode(false);
      onClose();
    } catch (error) {
      setAddActivityError(error.message || 'Erro ao adicionar atividade');
    } finally {
      setAddActivityLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 p-6"
        >
          <h3 className="text-xl font-bold text-[#8b8b8b] font-cinzel mb-4">Adicionar Atividade</h3>
          <p className="text-sm text-[#8b8b8b]/70 mb-6">{formatDateDisplay(currentDate)}</p>

          {addActivityError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
              {addActivityError}
            </div>
          )}

          <div className="space-y-4">
            {/* DROPDOWN */}
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

            {/* NOME PERSONALIZADO */}
            {(isCustomMode || addActivityName === '') && (
              <input
                type="text"
                value={isCustomMode && addActivityName === 'custom' ? '' : addActivityName}
                onChange={(e) => setAddActivityName(e.target.value)}
                placeholder="Nome da atividade"
                className="w-full p-3 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
              />
            )}

            {/* TIPO */}
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

            {/* CAMPOS DE TEMPO */}
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

            {/* BOTÕES */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={addActivityLoading}
                className="flex-1 p-3 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all font-medium border border-[#8b8b8b]/30 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
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
    </AnimatePresence>
  );
}
