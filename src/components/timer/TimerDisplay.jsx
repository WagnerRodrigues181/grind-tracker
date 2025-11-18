import { Timer, Play, Pause, StopCircle, AlertCircle } from 'lucide-react';
import { useTimer } from '../../contexts/TimerContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function TimerDisplay() {
  const {
    activeTimer,
    isPaused,
    remainingSeconds,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    getProgress,
  } = useTimer();

  if (!activeTimer) return null;

  const progress = getProgress();
  const circumference = 2 * Math.PI * 16; // raio = 16
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isWarning = remainingSeconds <= 30;
  const isCritical = remainingSeconds <= 10;

  function handleStop() {
    if (confirm('⏹️ Deseja realmente parar o timer? O progresso será perdido.')) {
      stopTimer();
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: 20 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all ${
          isPaused
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : isCritical
              ? 'bg-red-500/10 border-red-500/30 animate-pulse'
              : isWarning
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-[#8b8b8b]/10 border-[#8b8b8b]/30'
        }`}
      >
        {/* Progresso Circular */}
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg className="w-11 h-11 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="22"
              cy="22"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-[#8b8b8b]/20"
            />
            {/* Progress circle */}
            <circle
              cx="22"
              cy="22"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-300 ${
                isPaused
                  ? 'text-yellow-500'
                  : isCritical
                    ? 'text-red-500'
                    : isWarning
                      ? 'text-orange-500'
                      : 'text-[#8b8b8b]'
              }`}
            />
          </svg>
          {/* Ícone central */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isPaused ? (
              <Pause className="w-4 h-4 text-yellow-500" />
            ) : isCritical ? (
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <Timer className={`w-4 h-4 ${isWarning ? 'text-orange-500' : 'text-[#8b8b8b]'}`} />
            )}
          </div>
        </div>

        {/* Informações do timer */}
        <div className="flex flex-col min-w-[110px]">
          <span
            className={`text-xs font-medium truncate max-w-[150px] ${
              isPaused
                ? 'text-yellow-500/70'
                : isCritical
                  ? 'text-red-500/70'
                  : isWarning
                    ? 'text-orange-500/70'
                    : 'text-[#8b8b8b]/70'
            }`}
          >
            {isPaused ? '⏸️ Pausado' : activeTimer.activityName}
          </span>
          <span
            className={`text-base font-bold tabular-nums ${
              isPaused
                ? 'text-yellow-500'
                : isCritical
                  ? 'text-red-500'
                  : isWarning
                    ? 'text-orange-500'
                    : 'text-[#8b8b8b]'
            }`}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-1.5 ml-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={isPaused ? resumeTimer : pauseTimer}
            className={`p-2 rounded-lg transition-all ${
              isPaused
                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-500'
                : 'bg-[#8b8b8b]/20 hover:bg-[#8b8b8b]/30 text-[#8b8b8b]'
            }`}
            title={isPaused ? 'Retomar' : 'Pausar'}
          >
            {isPaused ? (
              <Play className="w-4 h-4" fill="currentColor" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStop}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-all"
            title="Parar Timer"
          >
            <StopCircle className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
