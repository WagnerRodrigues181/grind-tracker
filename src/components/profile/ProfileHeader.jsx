import { memo } from 'react';
import { Calendar, Edit2, Lock } from 'lucide-react';

function ProfileHeader({ profile, onEdit, formatDateDisplay, isDemoProfile }) {
  return (
    <div className="flex flex-col items-center">
      {/* Avatar, sem float no mobile pra não desperdiçar altura */}
      <div className="relative sm-animate-float">
        {/* Anel giratório, margem menor no mobile */}
        <div className="absolute inset-0 -m-2 sm:-m-3">
          <div
            className="w-full h-full rounded-full border-2 border-dashed border-[#8b8b8b]/20 animate-spin"
            style={{ animationDuration: '20s' }}
          />
        </div>

        <div className="relative">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover
                         border-4 border-[#8b8b8b]/30 shadow-2xl"
            />
          ) : (
            <div
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full
                         bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b]
                         flex items-center justify-center
                         text-3xl sm:text-4xl font-bold text-[#1a1a1a]
                         shadow-2xl animate-pulse-glow trophy-shine"
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <button
            onClick={onEdit}
            disabled={isDemoProfile}
            className={`absolute -bottom-1 -right-1 p-2 sm:p-2.5 rounded-full shadow-lg transition-all ${
              isDemoProfile
                ? 'bg-[#252525] text-[#8b8b8b]/50 cursor-not-allowed'
                : 'bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] text-[#1a1a1a] hover:scale-110 hover:shadow-xl hover:shadow-[#8b8b8b]/50'
            }`}
            title={isDemoProfile ? '🔒 Perfil demo bloqueado' : 'Editar perfil'}
          >
            {isDemoProfile ? (
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Nome */}
      <h3
        className="mt-3 sm:mt-5 text-lg sm:text-2xl font-bold text-[#8b8b8b]
                   font-cinzel tracking-wide text-center px-4"
        style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
      >
        {profile.displayName}
      </h3>

      {/* E-mail */}
      <p className="text-xs sm:text-sm text-[#8b8b8b]/60 mt-1 max-w-full px-6 truncate text-center">
        {profile.email}
      </p>

      {/* Badge "Membro desde" */}
      <div
        className="flex items-center gap-1.5 mt-2 sm:mt-3 px-3 py-1.5
                      bg-[#8b8b8b]/5 rounded-full border border-[#8b8b8b]/20"
      >
        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#8b8b8b]/70 flex-shrink-0" />
        <span className="text-[10px] sm:text-xs text-[#8b8b8b]/70 text-center">
          Membro desde {formatDateDisplay(profile.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default memo(ProfileHeader);
