import { memo } from 'react';
import { Calendar, Edit2, Lock } from 'lucide-react';

/**
 * Header do perfil (avatar + nome + data de criação)
 * ✅ Memoizado
 */
function ProfileHeader({ profile, onEdit, formatDateDisplay, isDemoProfile }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative animate-float">
        <div className="absolute inset-0 -m-3">
          <div
            className="w-full h-full rounded-full border-2 border-dashed border-[#8b8b8b]/20 animate-spin"
            style={{ animationDuration: '20s' }}
          ></div>
        </div>

        <div className="relative">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-28 h-28 rounded-full object-cover border-4 border-[#8b8b8b]/30 shadow-2xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] flex items-center justify-center text-4xl font-bold text-[#1a1a1a] shadow-2xl animate-pulse-glow trophy-shine">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* ✅ BOTÃO EDITAR COM BLOQUEIO */}
          <button
            onClick={onEdit}
            disabled={isDemoProfile}
            className={`absolute -bottom-1 -right-1 p-2.5 rounded-full shadow-lg transition-all ${
              isDemoProfile
                ? 'bg-[#252525] text-[#8b8b8b]/50 cursor-not-allowed'
                : 'bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] text-[#1a1a1a] hover:scale-110 hover:shadow-xl hover:shadow-[#8b8b8b]/50'
            }`}
            title={isDemoProfile ? '🔒 Perfil demo bloqueado' : 'Editar perfil'}
          >
            {isDemoProfile ? <Lock className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <h3
        className="mt-5 text-2xl font-bold text-[#8b8b8b] font-cinzel tracking-wide"
        style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
      >
        {profile.displayName}
      </h3>
      <p className="text-sm text-[#8b8b8b]/60 mt-1">{profile.email}</p>

      <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-[#8b8b8b]/5 rounded-full border border-[#8b8b8b]/20">
        <Calendar className="w-4 h-4 text-[#8b8b8b]/70" />
        <span className="text-xs text-[#8b8b8b]/70">
          Membro desde {formatDateDisplay(profile.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ✅ EXPORTA MEMOIZADO
export default memo(ProfileHeader);
