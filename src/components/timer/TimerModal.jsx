import { useState, useEffect } from 'react';
import { X, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_PRESETS = [
  { label: '15min', hours: 0, minutes: 15, seconds: 0, icon: '⚡' },
  { label: '30min', hours: 0, minutes: 30, seconds: 0, icon: '🔥' },
  { label: '45min', hours: 0, minutes: 45, seconds: 0, icon: '💪' },
  { label: '1h', hours: 1, minutes: 0, seconds: 0, icon: '🎯' },
  { label: '1h30', hours: 1, minutes: 30, seconds: 0, icon: '⭐' },
  { label: '2h', hours: 2, minutes: 0, seconds: 0, icon: '🚀' },
];

export default function TimerModal({ isOpen, onClose, activityName, onStart }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(1); // 30min por padrão

  useEffect(() => {
    if (isOpen) {
      // Reset para preset padrão ao abrir
      const preset = QUICK_PRESETS[1]; // 30min
      setHours(preset.hours);
      setMinutes(preset.minutes);
      setSeconds(preset.seconds);
      setSelectedPreset(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handlePresetClick(index) {
    const preset = QUICK_PRESETS[index];
    setHours(preset.hours);
    setMinutes(preset.minutes);
    setSeconds(preset.seconds);
    setSelectedPreset(index);
  }

  function handleStart() {
    if (hours === 0 && minutes === 0 && seconds === 0) {
      alert('⏰ Defina um tempo maior que zero');
      return;
    }
    onStart(hours, minutes, seconds);
    onClose();
  }

  function handleInputChange(setter, max) {
    return (e) => {
      const value = parseInt(e.target.value) || 0;
      setter(Math.max(0, Math.min(max, value)));
      setSelectedPreset(null); // Desmarcar preset ao editar manualmente
    };
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const isValid = totalSeconds > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-[#1e1e1e] via-[#232323] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com gradiente */}
          <div className="relative bg-gradient-to-r from-[#8b8b8b]/10 to-[#8b8b8b]/5 p-6 border-b border-[#8b8b8b]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8b8b8b]/20 rounded-lg">
                  <Clock className="w-5 h-5 text-[#8b8b8b]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#8b8b8b]">Configurar Timer</h3>
                  <p className="text-sm text-[#8b8b8b]/60 mt-0.5">{activityName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#8b8b8b]/70 hover:text-[#8b8b8b] hover:bg-[#8b8b8b]/10 rounded-lg transition-all active:scale-95"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Presets Rápidos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#8b8b8b]" />
                <label className="text-sm font-semibold text-[#8b8b8b]">Tempos Rápidos</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_PRESETS.map((preset, index) => (
                  <motion.button
                    key={preset.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePresetClick(index)}
                    className={`relative px-4 py-3 rounded-xl font-medium transition-all ${
                      selectedPreset === index
                        ? 'bg-[#8b8b8b] text-[#1a1a1a] shadow-lg shadow-[#8b8b8b]/30'
                        : 'bg-[#8b8b8b]/10 text-[#8b8b8b] hover:bg-[#8b8b8b]/20'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{preset.icon}</div>
                    <div className="text-sm font-bold">{preset.label}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#8b8b8b]/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-[#8b8b8b]/50 bg-[#1e1e1e]">
                  ou personalizado
                </span>
              </div>
            </div>

            {/* Inputs Personalizados */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8b8b8b]">Horas</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={handleInputChange(setHours, 23)}
                  className="w-full px-3 py-3 text-center text-2xl font-bold bg-[#1a1a1a] text-[#8b8b8b] border-2 border-[#8b8b8b]/30 rounded-xl focus:border-[#8b8b8b] focus:ring-2 focus:ring-[#8b8b8b]/20 outline-none transition-all"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8b8b8b]">Minutos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={handleInputChange(setMinutes, 59)}
                  className="w-full px-3 py-3 text-center text-2xl font-bold bg-[#1a1a1a] text-[#8b8b8b] border-2 border-[#8b8b8b]/30 rounded-xl focus:border-[#8b8b8b] focus:ring-2 focus:ring-[#8b8b8b]/20 outline-none transition-all"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8b8b8b]">Segundos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={handleInputChange(setSeconds, 59)}
                  className="w-full px-3 py-3 text-center text-2xl font-bold bg-[#1a1a1a] text-[#8b8b8b] border-2 border-[#8b8b8b]/30 rounded-xl focus:border-[#8b8b8b] focus:ring-2 focus:ring-[#8b8b8b]/20 outline-none transition-all"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            {/* Preview do tempo total */}
            {isValid && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#8b8b8b]/10 rounded-xl"
              >
                <Clock className="w-4 h-4 text-[#8b8b8b]" />
                <span className="text-sm font-medium text-[#8b8b8b]">
                  Duração total:{' '}
                  <span className="font-bold">
                    {hours > 0 && `${hours}h `}
                    {minutes > 0 && `${minutes}min `}
                    {seconds > 0 && `${seconds}s`}
                  </span>
                </span>
              </motion.div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#8b8b8b]/10 text-[#8b8b8b] rounded-xl hover:bg-[#8b8b8b]/20 transition-all font-medium"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: isValid ? 1.02 : 1 }}
                whileTap={{ scale: isValid ? 0.98 : 1 }}
                onClick={handleStart}
                disabled={!isValid}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                  isValid
                    ? 'bg-[#8b8b8b] text-[#1a1a1a] hover:bg-[#a0a0a0] shadow-lg shadow-[#8b8b8b]/30'
                    : 'bg-[#8b8b8b]/20 text-[#8b8b8b]/40 cursor-not-allowed'
                }`}
              >
                🚀 Iniciar Timer
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
