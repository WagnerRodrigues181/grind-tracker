import { useState } from 'react';
import { Plus, Loader2, Settings, Clock, CheckSquare, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  addCustomActivityTemplate,
  deleteCustomActivityTemplate,
  updateCustomActivityTemplate,
} from '../../services/activitiesService';

const getToday = () => new Date().toISOString().split('T')[0];
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function ActivityForm({
  onActivityAdded,
  customActivities = [],
  loadingActivities = false,
}) {
  const { currentUser } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [activityType, setActivityType] = useState('timed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Estados para o formulário do modal de ADICIONAR
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityType, setNewActivityType] = useState('timed');
  const [newActivityTime, setNewActivityTime] = useState('');
  const [newActivityTarget, setNewActivityTarget] = useState('');

  // Estados para o modal de EDIÇÃO
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('timed');
  const [editTime, setEditTime] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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
        date: getToday(),
        createdAt: serverTimestamp(),
      });
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
        date: getToday(),
        createdAt: serverTimestamp(),
      });

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
    if (onActivityAdded) onActivityAdded();
    setTimeout(() => setSuccess(''), 3000);
  }

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

  // ============================================
  // FUNÇÕES DE EDIÇÃO
  // ============================================
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .btn-hover-scale { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-hover-scale:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(139, 139, 139, 0.3); }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; margin: 8px 0; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8b8b8b, #6b6b6b); border-radius: 10px; border: 2px solid #1a1a1a; transition: background 0.3s ease; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #a0a0a0, #808080); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #8b8b8b #1a1a1a; }
        
        .edit-btn { transition: all 0.2s ease; }
        .edit-btn:hover { transform: translateX(-2px); }
      `}</style>

      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl font-inter p-6 border-2 border-[#8b8b8b]/20">
        <div className="flex justify-between items-center mb-6">
          <h2
            className="text-2xl font-bold text-[#8b8b8b] font-cinzel"
            style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
          >
            Adicionar Atividade
          </h2>
          <button
            onClick={() => setShowMenu(true)}
            className="text-sm flex items-center gap-1 text-[#8b8b8b]/70 hover:text-[#8b8b8b] transition-colors"
          >
            <Settings className="w-4 h-4" /> Gerenciar
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8b8b8b] mb-1">Atividade</label>
            {loadingActivities ? (
              <div className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b]/50 rounded-xl border border-[#8b8b8b]/30 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <select
                value={selectedActivity}
                onChange={(e) => handleSelectActivity(e.target.value)}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
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
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActivityType('timed')}
                  className={`p-4 rounded-xl border-2 transition-all ${activityType === 'timed' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b8b]/30'}`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-2 text-[#8b8b8b]" />
                  <span className="text-sm text-[#8b8b8b]">Com Tempo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('binary')}
                  className={`p-4 rounded-xl border-2 transition-all ${activityType === 'binary' ? 'border-[#8b8b8b] bg-[#8b8b8b]/10' : 'border-[#8b8b8b]/30'}`}
                >
                  <CheckSquare className="w-5 h-5 mx-auto mb-2 text-[#8b8b8b]" />
                  <span className="text-sm text-[#8b8b8b]">Check Diário</span>
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
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Meta diária (opcional)"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                maxLength={5}
                className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                disabled={loading}
              />
            </>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-xl text-green-300 text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || loadingActivities}
            className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold shadow-lg btn-hover-scale flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* MODAL GERENCIAR */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-[#8b8b8b]/30 max-h-[90vh] flex flex-col relative"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <button
                  onClick={() => setShowMenu(false)}
                  className="absolute top-4 right-4 text-2xl text-[#8b8b8b] hover:text-[#a0a0a0] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#8b8b8b]/10"
                >
                  ×
                </button>

                <h3 className="text-xl font-bold text-[#8b8b8b] mb-6 font-cinzel pr-8">
                  Atividades Personalizadas
                </h3>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <div
                    className="custom-scrollbar overflow-y-auto pr-2 space-y-3 mb-6 flex-shrink-0"
                    style={{ maxHeight: '300px' }}
                  >
                    {loadingActivities ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8b8b8b]" />
                      </div>
                    ) : customActivities.length === 0 ? (
                      <p className="text-center text-[#8b8b8b]/60 py-8">
                        Nenhuma atividade cadastrada
                      </p>
                    ) : (
                      customActivities.map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-[#8b8b8b] block truncate">
                              {a.name}
                            </span>
                            {a.type === 'binary' ? (
                              <span className="inline-block mt-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                ✓ Check
                              </span>
                            ) : (
                              <span className="block mt-1 text-xs text-[#8b8b8b]/60">
                                ⏱ {a.time}
                                {a.target && ` → 🎯 ${a.target}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <button
                              onClick={() => openEditModal(a)}
                              className="edit-btn text-blue-400 hover:text-blue-300 text-sm font-medium transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleRemove(a.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-4 border-t border-[#8b8b8b]/30 pt-6 flex-shrink-0">
                    <input
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      placeholder="Nome da atividade"
                      className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                    />
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value)}
                      className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
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
                          className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                        />
                        <input
                          value={newActivityTarget}
                          onChange={(e) => setNewActivityTarget(e.target.value)}
                          placeholder="Meta (ex: 04:00)"
                          className="w-full p-4 bg-[#1a1a1a] text-[#8b8b8b] placeholder-[#8b8b8b]/40 rounded-xl border border-[#8b8b8b]/30 focus:border-[#8b8b8b] focus:outline-none transition-all"
                        />
                      </>
                    )}
                    <button
                      onClick={handleAddCustom}
                      className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold btn-hover-scale transition-all"
                    >
                      <Plus className="w-5 h-5 inline mr-2" />
                      Adicionar Nova Atividade
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DE EDIÇÃO */}
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
      </div>
    </>
  );
}
