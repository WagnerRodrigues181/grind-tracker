import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../../utils/dateHelpers';

/**
 * Modal de descrição da atividade
 */
export default function ActivityModal({ activity, onClose, onSave, onDelete, loading }) {
  const [descriptionText, setDescriptionText] = useState(activity.description || '');

  if (!activity) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-3xl bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#8b8b8b]/30">
          <h3 className="text-2xl font-bold text-[#8b8b8b] font-cinzel">{activity.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-[#8b8b8b]/70 hover:text-[#8b8b8b] hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#8b8b8b]/5 to-[#8b8b8b]/10">
                {activity.image ? (
                  <img
                    src={activity.image}
                    alt={activity.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                    📄
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#8b8b8b]/10 rounded-lg">
                  {activity.data?.type === 'binary' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-bold text-green-400">Concluído</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-[#8b8b8b]" />
                      <span className="text-sm font-bold text-[#8b8b8b]">
                        {formatDuration(activity.data?.total || 0)}
                      </span>
                    </>
                  )}
                </div>
                {activity.data?.target && activity.data?.type !== 'binary' && (
                  <div className="text-sm text-[#8b8b8b]/70 px-3">
                    Meta: {formatDuration(activity.data.target)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b8b8b] mb-2">
                  Descrição do dia
                </label>
                <textarea
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  rows={8}
                  placeholder="Descreva como foi o treino, notas, observações..."
                  className="w-full resize-y p-3 rounded-lg bg-[#1a1a1a] text-[#8b8b8b] border border-[#8b8b8b]/30 focus:border-[#8b8b8b] outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => onSave(descriptionText)}
                  className="px-4 py-2 bg-[#8b8b8b] text-[#1a1a1a] rounded-lg hover:bg-[#a0a0a0] transition-colors font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar descrição'}
                </button>

                <button
                  onClick={onDelete}
                  className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
                >
                  Remover
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#8b8b8b]/10 text-[#8b8b8b] rounded-lg hover:bg-[#8b8b8b]/20 transition-colors font-medium ml-auto"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function X({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
