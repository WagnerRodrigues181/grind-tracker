import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Check, X, Camera, Lock } from 'lucide-react';
import { auth } from '../../services/firebase';
import { updateProfile } from 'firebase/auth';

import { useUserStats } from '../../hooks/useUserStats';
import { getLevelInfo } from '../../utils/constants/colors';
import { formatFirebaseTimestamp } from '../../utils/formatters/dateFormatters';

import ProfileHeader from './ProfileHeader';
import ProfileStats from './ProfileStats';
import TopActivities from './TopActivities';

const DEMO_UID = 'NzDVaejxMgQPO13ud1db1v2opqE2';

export default function ProfileCard({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [animateStats, setAnimateStats] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDemoProfile = auth.currentUser?.uid === DEMO_UID;
  const { stats, loading: statsLoading, error: statsError } = useUserStats(auth.currentUser?.uid);

  useEffect(() => {
    setIsVisible(true);
    loadUserData();
  }, []);

  useEffect(() => {
    if (stats && !statsLoading) {
      setTimeout(() => setAnimateStats(true), 100);
    }
  }, [stats, statsLoading]);

  async function loadUserData() {
    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorMessage('Nenhum usuário logado.');
        return;
      }
      const profileData = {
        displayName: user.displayName || 'Usuário',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: user.metadata.creationTime,
        uid: user.uid,
      };
      setProfile(profileData);
      setEditName(profileData.displayName);
      setEditPhoto(profileData.photoURL || '');
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setErrorMessage('Erro ao puxar dados.');
    }
  }

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (isDemoProfile) {
      setError('🔒 Perfil demo não pode ser editado');
      return;
    }
    setError('');
    if (!editName.trim()) {
      setError('Nome não pode ser vazio.');
      return;
    }
    if (editPhoto && !isValidUrl(editPhoto)) {
      setError('URL da foto inválida.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName.trim(),
        photoURL: editPhoto.trim() || null,
      });
      await loadUserData();
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Falha ao salvar. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(profile.displayName);
    setEditPhoto(profile.photoURL || '');
    setIsEditing(false);
    setError('');
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 250);
  };

  const handleEditClick = () => {
    if (isDemoProfile) return;
    setIsEditing(true);
  };

  // ── ERRO ──────────────────────────────────────────────────────────────────
  if (errorMessage) {
    return <div className="p-8 text-red-500">{errorMessage}</div>;
  }

  // ── SKELETON ──────────────────────────────────────────────────────────────
  if (!profile || statsLoading) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-[480px] mx-auto
                       bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a]
                       rounded-3xl shadow-2xl border border-[#8b8b8b]/20 overflow-hidden"
          >
            <div className="p-5 sm:p-8">
              <div className="animate-pulse space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-[#8b8b8b]/20 to-[#8b8b8b]/10 rounded-full" />
                  <div className="mt-3 h-6 bg-[#8b8b8b]/20 rounded-lg w-40" />
                  <div className="mt-2 h-4 bg-[#8b8b8b]/10 rounded w-32" />
                </div>
                <div className="space-y-4">
                  <div className="h-20 bg-[#8b8b8b]/10 rounded-2xl" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-[#8b8b8b]/10 rounded-xl" />
                    <div className="h-16 bg-[#8b8b8b]/10 rounded-xl" />
                    <div className="h-16 bg-[#8b8b8b]/10 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── ERRO DE STATS ─────────────────────────────────────────────────────────
  if (statsError) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-[480px] mx-auto
                       bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a]
                       rounded-3xl shadow-2xl border border-[#8b8b8b]/20 overflow-hidden
                       p-5 sm:p-8"
          >
            <p className="text-[#8b8b8b] text-center">Erro ao carregar estatísticas</p>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-10px); }
            }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(139,139,139,0.3); }
              50%       { box-shadow: 0 0 40px rgba(139,139,139,0.6); }
            }
            @keyframes count-up {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes slide-up {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes shine {
              0%   { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
              100% { transform: translateX(100%)  translateY(100%)  rotate(45deg); }
            }
            .sm-animate-float { /* aplicado via classe condicional no ProfileHeader */ }
            @media (min-width: 640px) {
              .sm-animate-float { animation: float 3s ease-in-out infinite; }
            }
            .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
            .animate-count-up   { animation: count-up 0.6s ease-out forwards; }
            .animate-slide-up   { animation: slide-up 0.5s ease-out 0.3s both; }
            .stat-card          { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
            .stat-card:hover    { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(139,139,139,0.3); }
            .trophy-shine       { position: relative; overflow: hidden; }
            .trophy-shine::before {
              content: '';
              position: absolute;
              top: -50%; left: -50%;
              width: 200%; height: 200%;
              background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
              transform: rotate(45deg);
              animation: shine 3s infinite;
            }
          `}</style>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-[480px] mx-auto
                       bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a]
                       rounded-3xl shadow-2xl border-2 border-[#8b8b8b]/30 relative
                       flex flex-col
                       max-h-[calc(100svh-1.5rem)] sm:max-h-[calc(100svh-3rem)]"
          >
            {/* Padrão pontilhado */}
            <div
              className="absolute inset-0 opacity-5 rounded-3xl pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, #8b8b8b 1px, transparent 0)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#8b8b8b]/10 to-transparent rounded-t-3xl pointer-events-none" />

            {/* Badge demo */}
            {isDemoProfile && (
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-xs font-bold text-amber-400">
                    PERFIL DEMO
                  </span>
                </div>
              </div>
            )}

            {/* ── CONTEÚDO ROLÁVEL ─────────────────────────────────────── */}
            <div
              className="relative z-10 flex-1 overflow-y-auto
                            p-4 sm:p-8 space-y-3 sm:space-y-6"
            >
              {isEditing ? (
                /* MODO EDIÇÃO */
                <div className="flex flex-col items-center space-y-4">
                  {/* Preview foto */}
                  <div className="relative">
                    {editPhoto ? (
                      <img
                        src={editPhoto}
                        alt="Preview"
                        className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#8b8b8b]/30 shadow-2xl"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/112?text=?';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] flex items-center justify-center text-3xl sm:text-4xl font-bold text-[#1a1a1a] shadow-2xl">
                        {editName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 p-2 sm:p-2.5 bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] rounded-full text-[#1a1a1a] shadow-lg">
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  {/* URL da foto */}
                  <div className="w-full">
                    <label className="text-xs text-[#8b8b8b]/70 font-semibold mb-1 block">
                      URL da Foto
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={editPhoto}
                      onChange={(e) => setEditPhoto(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 bg-[#252525] border border-[#8b8b8b]/20 rounded-xl text-sm text-[#8b8b8b] placeholder-[#8b8b8b]/30 focus:border-[#8b8b8b]/50 focus:outline-none transition-colors"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  {/* Nome */}
                  <div className="w-full">
                    <label className="text-xs text-[#8b8b8b]/70 font-semibold mb-1 block">
                      Nome de Guerra
                    </label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#252525] border border-[#8b8b8b]/20 rounded-xl text-base sm:text-lg font-bold text-center text-[#8b8b8b] placeholder-[#8b8b8b]/30 focus:border-[#8b8b8b]/50 focus:outline-none transition-colors"
                      style={{ fontSize: '16px' }}
                      maxLength={50}
                    />
                  </div>

                  {error && (
                    <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-sm text-red-400 text-center font-semibold">{error}</p>
                    </div>
                  )}

                  {/* Botões edição */}
                  <div className="flex gap-3 w-full pt-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex-1 py-2.5 sm:py-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#8b8b8b] rounded-xl transition-all duration-300 font-semibold border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-2.5 sm:py-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-[#8b8b8b]/40 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Salvar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* MODO VISUALIZAÇÃO */
                <>
                  <ProfileHeader
                    profile={profile}
                    onEdit={handleEditClick}
                    formatDateDisplay={formatFirebaseTimestamp}
                    isDemoProfile={isDemoProfile}
                  />

                  <ProfileStats stats={stats} animateStats={animateStats} getLevel={getLevelInfo} />

                  <TopActivities stats={stats} animateStats={animateStats} />

                  {/* Botões de ação */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleEditClick}
                      disabled={isDemoProfile}
                      className={`flex-1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isDemoProfile
                          ? 'bg-[#252525] text-[#8b8b8b]/50 cursor-not-allowed border border-[#8b8b8b]/20'
                          : 'bg-gradient-to-r from-[#8b8b8b] to-[#6b6b6b] text-[#1a1a1a] hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-[#8b8b8b]/50'
                      }`}
                      title={
                        isDemoProfile ? '🔒 Perfil demo não pode ser editado' : 'Editar perfil'
                      }
                    >
                      {isDemoProfile ? (
                        <>
                          <Lock className="w-4 h-4" /> Bloqueado
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" /> Editar Perfil
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 sm:px-5 py-2.5 sm:py-3 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl font-bold text-sm border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#8b8b8b]/5 to-transparent pointer-events-none rounded-b-3xl" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
