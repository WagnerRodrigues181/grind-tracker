import { memo, useState } from 'react';
import { Trophy, Flame, TrendingUp, Award, Clock } from 'lucide-react';

/**
 * Cards de estatísticas do usuário.
 * ✅ Memoizado
 *
 * MUDANÇAS:
 * - Número principal do hero card: text-5xl sm:text-6xl (evita overflow no mobile)
 * - Grid de quick-stats: padding e tamanhos de texto responsivos
 * - Expansão de média diária: grid de 1 coluna no mobile, 2 no sm
 */
function ProfileStats({ stats, animateStats, getLevel }) {
  const [isAvgExpanded, setIsAvgExpanded] = useState(false);

  if (!stats) return null;

  const levelInfo = getLevel(stats.totalHours);
  const hoursToNext = levelInfo.next ? levelInfo.next - stats.totalHours : 0;

  return (
    <>
      {/* ── HERO CARD ─────────────────────────────────────────────────── */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8b8b8b]/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
        <div className="relative bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-2xl p-4 sm:p-6 border-2 border-[#8b8b8b]/30 trophy-shine overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              <span className="text-xs sm:text-sm font-semibold text-[#8b8b8b]/70">
                Total Grindado
              </span>
            </div>
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 animate-pulse" />
          </div>

          <div className="flex items-end justify-between mb-4 gap-2">
            <div
              className={`flex items-baseline gap-2 min-w-0 ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
            >
              <span
                className="text-5xl sm:text-6xl font-black text-[#8b8b8b] tracking-tighter leading-none"
                style={{ textShadow: '0 0 30px rgba(139,139,139,0.6)' }}
              >
                {stats.totalHours.toLocaleString()}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-[#8b8b8b]/50 flex-shrink-0">
                horas
              </span>
            </div>

            <div
              className={`bg-gradient-to-br ${levelInfo.color} px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-1.5 text-white font-bold text-xs sm:text-sm shadow-lg animate-slide-up flex-shrink-0`}
            >
              <span className="text-base sm:text-lg">{levelInfo.icon}</span>
              <span>{levelInfo.level}</span>
            </div>
          </div>

          {levelInfo.next && (
            <div className="mt-3 space-y-1.5 animate-slide-up">
              <div className="flex justify-between text-[10px] sm:text-xs text-[#8b8b8b]/60">
                <span>
                  Faltam {hoursToNext}h para {getLevel(levelInfo.next).level}
                </span>
                <span className="font-bold">
                  {((stats.totalHours / levelInfo.next) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${levelInfo.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{
                    width: animateStats ? `${(stats.totalHours / levelInfo.next) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK STATS ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Sequência */}
          <div className="stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-3 sm:p-4 border border-[#8b8b8b]/20 text-center">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mx-auto mb-1.5 sm:mb-2" />
            <div
              className={`text-xl sm:text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
            >
              {stats.weekStreak}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#8b8b8b]/60 font-medium mt-1">
              Sequência
            </div>
          </div>

          {/* Média / Dia (expansível) */}
          <div
            onClick={() => setIsAvgExpanded(!isAvgExpanded)}
            className={`stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-3 sm:p-4 border border-[#8b8b8b]/20 text-center cursor-pointer transition-all ${isAvgExpanded ? 'ring-2 ring-green-500/50' : ''}`}
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mx-auto mb-1.5 sm:mb-2" />
            <div
              className={`text-xl sm:text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
            >
              {stats.avgHoursPerDay}h
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#8b8b8b]/60 font-medium mt-1">
              Média/Dia
            </div>
            <div className="mt-1 text-[8px] sm:text-[9px] text-[#8b8b8b]/40">
              {isAvgExpanded ? '↑ Fechar' : '↓ Detalhes'}
            </div>
          </div>

          {/* Dias Ativos */}
          <div className="stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-3 sm:p-4 border border-[#8b8b8b]/20 text-center">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mx-auto mb-1.5 sm:mb-2" />
            <div
              className={`text-xl sm:text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
            >
              {stats.totalDays}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#8b8b8b]/60 font-medium mt-1">
              Dias Ativos
            </div>
          </div>
        </div>

        {/* Expansão: média por atividade */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isAvgExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-xl p-4 border border-[#8b8b8b]/20 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-green-400" />
              <h5 className="text-xs font-bold text-[#8b8b8b]/80">Média Diária por Atividade</h5>
            </div>
            {stats.avgPerActivity.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                {stats.avgPerActivity.map((act, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-[#1a1a1a]/50 px-3 py-2 rounded-lg gap-2"
                  >
                    <span className="text-[#8b8b8b]/80 truncate">{act.name}</span>
                    <span className="font-mono text-green-400 font-bold flex-shrink-0">
                      {act.avgHours}h
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-[#8b8b8b]/40 text-center">
                Nenhuma atividade registrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(ProfileStats);
