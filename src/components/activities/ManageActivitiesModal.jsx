import { useState, useEffect } from 'react';
import { Plus, Loader2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useActivities } from '../../contexts/ActivitiesContext';
import {
  addCustomActivityTemplate,
  deleteCustomActivityTemplate,
  updateCustomActivityTemplate,
} from '../../services/activitiesService';

export default function ManageActivitiesModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const { customActivities, loadingCustomActivities } = useActivities();

  // Estados para formulário de adicionar
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityType, setNewActivityType] = useState('timed');
  const [newActivityTime, setNewActivityTime] = useState('');
  const [newActivityTarget, setNewActivityTarget] = useState('');

  // Estados para edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('timed');
  const [editTime, setEditTime] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function handleAddCustom() {
    const name = newActivityName.trim();
    if (!name) return;

    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (newActivityTime && !timeRegex.test(newActivityTime)) {
      alert('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    if (newActivityTarget && !timeRegex.test(newActivityTarget)) {
      alert('Formato de meta inválido. Use HH:MM (ex: 04:00)');
      return;
    }

    try {
      await addCustomActivityTemplate(currentUser.uid, {
        name,
        type: newActivityType,
        time: newActivityTime.trim() || '00:30',
        target: newActivityTarget.trim() || '',
      });

      setNewActivityName('');
      setNewActivityType('timed');
      setNewActivityTime('');
      setNewActivityTarget('');
    } catch (e) {
      console.error('Erro ao salvar template:', e);
      alert('Erro ao salvar template');
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remover essa atividade personalizada?')) return;
    try {
      await deleteCustomActivityTemplate(currentUser.uid, id);
    } catch (e) {
      alert('Erro ao remover');
    }
  }

  function openEditModal(activity) {
    setEditingActivity(activity);
    setEditName(activity.name);
    setEditType(activity.type || 'timed');
    setEditTime(activity.time || '');
    setEditTarget(activity.target || '');
    setEditError('');
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingActivity(null);
    setEditName('');
    setEditType('timed');
    setEditTime('');
    setEditTarget('');
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      setEditError('Nome não pode estar vazio');
      return;
    }

    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

    if (editType === 'timed') {
      if (!editTime || !timeRegex.test(editTime)) {
        setEditError('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
        return;
      }

      if (editTarget && !timeRegex.test(editTarget)) {
        setEditError('Formato de meta inválido. Use HH:MM (ex: 04:00)');
        return;
      }
    }

    try {
      setEditLoading(true);
      await updateCustomActivityTemplate(currentUser.uid, editingActivity.id, {
        name: editName.trim(),
        type: editType,
        time: editType === 'timed' ? editTime.trim() : '',
        target: editType === 'timed' ? editTarget.trim() : '',
      });
      closeEditModal();
    } catch (e) {
      console.error('Erro ao atualizar:', e);
      setEditError('Erro ao salvar alterações');
    } finally {
      setEditLoading(false);
    }
  }

  if (!isOpen) return null;

  // Organizar atividades em colunas de 8 itens
  const rowsPerColumn = 8;
  const columns = [];
  for (let i = 0; i < customActivities.length; i += rowsPerColumn) {
    columns.push(customActivities.slice(i, i + rowsPerColumn));
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl w-full max-w-[1600px] h-[85vh] border-2 border-[#8b8b8b]/30 flex flex-col relative"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-[#8b8b8b]/30 flex-shrink-0">
              <h3 className="text-2xl font-bold text-[#8b8b8b] font-cinzel">
                Gerenciar Atividades
              </h3>
              <button
                onClick={onClose}
                className="text-2xl text-[#8b8b8b] hover:text-[#a0a0a0] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#8b8b8b]/10"
              >
                ×
              </button>
            </div>

            {/* Conteúdo em grid horizontal */}
            <div className="flex-1 overflow-hidden p-6 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Coluna da esquerda: Lista de atividades em colunas dinâmicas */}
                <div className="flex flex-col min-h-0">
                  <h4 className="text-lg font-semibold text-[#8b8b8b] mb-4 font-cinzel flex-shrink-0">
                    Suas Atividades
                  </h4>
                  <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    {loadingCustomActivities ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8b8b8b]" />
                      </div>
                    ) : customActivities.length === 0 ? (
                      <p className="text-center text-[#8b8b8b]/60 py-8">
                        Nenhuma atividade cadastrada
                      </p>
                    ) : (
                      <div className="flex gap-4 min-w-max h-full">
                        {columns.map((column, colIndex) => (
                          <div key={colIndex} className="flex flex-col gap-3 w-[260px]">
                            {column.map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-xl border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 transition-colors group w-full"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-[#8b8b8b] block truncate text-sm pr-1">
                                    {a.name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {a.type === 'binary' ? (
                                      <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                        <span>✓</span> Check
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap gap-2 text-xs text-[#8b8b8b]/70">
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                          ⏱ {a.time}
                                        </span>
                                        {a.target && (
                                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                            🎯 {a.target}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                  <button
                                    onClick={() => openEditModal(a)}
                                    className="edit-btn text-blue-400 hover:text-blue-300 transition-all p-1 rounded hover:bg-blue-500/10"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemove(a.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10"
                                    title="Remover"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna da direita: Adicionar nova atividade */}
                <div className="flex flex-col min-h-0">
                  <h4 className="text-lg font-semibold text-[#8b8b8b] mb-4 font-cinzel flex-shrink-0">
                    Criar Nova Atividade
                  </h4>
                  <div className="space-y-4 bg-[#1a1a1a] p-5 rounded-xl border border-[#8b8b8b]/30 overflow-y-auto custom-scrollbar">
                    <input
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      placeholder="Nome da atividade"
                      className="w-full p-3 bg-[#1e1e1e] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    />
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value)}
                      className="w-full p-3 bg-[#1e1e1e] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    >
                      <option value="timed">⏱ Time (Treino, Estudo)</option>
                      <option value="binary">✓ Check (Dieta, Sono)</option>
                    </select>
                    {newActivityType === 'timed' && (
                      <>
                        <input
                          value={newActivityTime}
                          onChange={(e) => setNewActivityTime(e.target.value)}
                          placeholder="Tempo padrão (ex: 01:30)"
                          className="w-full p-3 bg-[#1e1e1e] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                        />
                        <input
                          value={newActivityTarget}
                          onChange={(e) => setNewActivityTarget(e.target.value)}
                          placeholder="Meta (ex: 04:00)"
                          className="w-full p-3 bg-[#1e1e1e] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                        />
                      </>
                    )}
                    <button
                      onClick={handleAddCustom}
                      className="w-full p-3 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Adicionar Nova Atividade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de edição */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEditModal}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/40 relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button
                onClick={closeEditModal}
                className="absolute top-4 right-4 text-2xl text-[#8b8b8b] hover:text-[#a0a0a0] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#8b8b8b]/10"
              >
                ×
              </button>

              <h3 className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel pr-8">
                Editar Atividade
              </h3>

              {editError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome da atividade"
                  className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                />

                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                >
                  <option value="timed">⏱ Time (Treino, Estudo)</option>
                  <option value="binary">✓ Check (Dieta, Sono)</option>
                </select>

                {editType === 'timed' && (
                  <>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="Tempo padrão (ex: 01:30)"
                      maxLength={5}
                      className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    />
                    <input
                      type="text"
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      placeholder="Meta (ex: 04:00)"
                      maxLength={5}
                      className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    />
                  </>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={closeEditModal}
                    disabled={editLoading}
                    className="flex-1 p-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex-1 p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .edit-btn { transition: all 0.2s ease; }
        .edit-btn:hover { transform: translateX(-2px); }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; margin: 8px 0; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8b8b8b, #6b6b6b); border-radius: 10px; border: 2px solid #1a1a1a; transition: background 0.3s ease; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #a0a0a0, #808080); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #8b8b8b #1a1a1a; }
        
        @media (max-width: 1024px) {
          .grid-cols-1.lg\\:grid-cols-2 {
            gap: 1rem;
          }
        }
      `}</style>
    </>
  );
}
