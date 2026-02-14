import { memo } from 'react';
import { Trash2, Timer, Target, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDuration } from '../../utils/formatters/timeFormatters';
import { getActivityImage } from '../../utils/constants/activityImages';

/**
 * Card individual de atividade
 * ✅ Memoizado - só re-renderiza se props mudarem
 */
function ActivityCard({
  name,
  data,
  isToday,
  onOpenModal,
  onOpenEditTarget,
  onAdjustTime,
  onStartTimer,
  onDeleteAll,
}) {
  const progress = data.target ? (data.total / data.target) * 100 : 0;
  const isComplete = progress >= 100;
  const activityImage = getActivityImage(name);
  const remaining = data.target ? data.target - data.total : 0;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.15 },
      }}
      className="activity-card group relative flex items-center gap-4 bg-[#1e1e1e] rounded-xl border border-[#8b8b8b]/30 p-4"
    >
      {/* Imagem */}
      <button
        onClick={() => onOpenModal(name)}
        className="w-44 h-44 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#8b8b8b]/5 to-[#8b8b8b]/10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#8b8b8b]"
      >
        {activityImage ? (
          <img
            src={activityImage}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-6xl opacity-20">📄</span>
        )}
      </button>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-[#8b8b8b] truncate mb-1">{name}</h3>
          <div className="flex items-center gap-2 text-sm">
            {data.type === 'binary' ? (
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Concluído
              </div>
            ) : (
              <>
                <span className="font-bold text-[#8b8b8b]">{formatDuration(data.total)}</span>
                {data.target && (
                  <span className="text-[#8b8b8b]/70">
                    / {formatDuration(data.target)} • {Math.round(progress)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        {data.type === 'binary' ? (
          <div className="space-y-1">
            <div className="w-full bg-green-500/20 rounded-full h-2 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-xs text-green-400/90 font-medium">✓ Tarefa concluída com sucesso</p>
          </div>
        ) : data.target ? (
          <div className="space-y-1">
            <div className="w-full bg-[#8b8b8b]/10 rounded-full h-2 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-green-500' : 'bg-[#8b8b8b]'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
              {!isComplete && <div className="progress-wave" />}
            </div>
            <p className="text-xs text-[#8b8b8b]/70">
              {isComplete ? '✓ Meta batida!' : remaining > 0 ? `${remaining}min restantes` : ''}
            </p>
          </div>
        ) : null}

        {/* Botões */}
        {data.type !== 'binary' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditTarget(name);
              }}
              className="flex-1 min-w-[80px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/5 text-[#8b8b8b]/80 rounded-md hover:bg-[#8b8b8b]/10 transition-colors border border-[#8b8b8b]/20 flex items-center justify-center gap-1"
            >
              <Target className="w-3.5 h-3.5" />
              Meta
            </button>
            <button
              onClick={() => onAdjustTime(name, -30)}
              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
            >
              −30
            </button>
            {isToday && (
              <button
                onClick={() => onStartTimer(name)}
                className="flex-1 min-w-[48px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-md hover:from-blue-500/20 hover:to-purple-500/20 transition-colors border border-blue-500/20"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Timer</span>
              </button>
            )}
            <button
              onClick={() => onAdjustTime(name, 30)}
              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b] text-[#1a1a1a] rounded-md hover:bg-[#a0a0a0] transition-colors"
            >
              +30
            </button>
            <button
              onClick={() => onAdjustTime(name, 45)}
              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
            >
              +45
            </button>
            <button
              onClick={() => onAdjustTime(name, 60)}
              className="flex-1 min-w-[48px] px-2 py-1.5 text-xs font-medium bg-[#8b8b8b]/20 text-[#8b8b8b] rounded-md hover:bg-[#8b8b8b]/30 transition-colors"
            >
              +1h
            </button>
          </div>
        )}
      </div>

      {/* Botão deletar */}
      <button
        onClick={() => onDeleteAll(name)}
        className="absolute top-3 right-3 p-2 bg-[#1e1e1e]/90 text-[#8b8b8b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ✅ EXPORTA MEMOIZADO
export default memo(ActivityCard);
