import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal para editar meta do dia
 */
export default function EditTargetModal({
  isOpen,
  onClose,
  onSave,
  activityName,
  currentTarget,
  currentDate,
  formatDateDisplay,
}) {
  const [editTargetValue, setEditTargetValue] = useState(currentTarget || '');
  const [editTargetLoading, setEditTargetLoading] = useState(false);

  async function handleSave() {
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (editTargetValue && !timeRegex.test(editTargetValue)) {
      alert('Formato inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    setEditTargetLoading(true);
    try {
      await onSave(editTargetValue);
      onClose();
    } catch (error) {
      alert('Erro ao salvar meta');
    } finally {
      setEditTargetLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        /* MOBILE: abre como bottom sheet (items-end), DESKTOP: centralizado (sm:items-center) */
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-sm bg-gradient-to-br from-[#1e1e1e] to-[#252525]
            rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 p-5 sm:p-6
            max-h-[92dvh] overflow-y-auto"
        >
          <h3 className="text-lg font-bold text-[#8b8b8b] font-cinzel mb-1">Ajustar Meta</h3>
          <p className="text-sm text-[#8b8b8b]/70 mb-4">
            {activityName} • {formatDateDisplay(currentDate)}
          </p>
          <input
            type="text"
            value={editTargetValue}
            onChange={(e) => setEditTargetValue(e.target.value)}
            placeholder="Nova meta (HH:MM)"
            maxLength={5}
            className="w-full p-3 mb-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
          />
          <p className="text-xs text-[#8b8b8b]/60 mb-5">
            💡 Esta meta se aplica apenas ao dia {formatDateDisplay(currentDate)}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={editTargetLoading}
              className="flex-1 p-3 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all font-medium border border-[#8b8b8b]/30 disabled:opacity-50 touch-target"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={editTargetLoading}
              className="flex-1 p-3 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2 touch-target"
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
    </AnimatePresence>
  );
}
