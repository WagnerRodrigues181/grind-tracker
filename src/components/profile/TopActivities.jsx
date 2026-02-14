import { Target } from 'lucide-react';
import { formatDuration } from '../../utils/dateHelpers';

/**
 * Ranking das top 3 atividades
 */
export default function TopActivities({ stats, animateStats }) {
  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-2xl p-5 border border-[#8b8b8b]/20">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[#8b8b8b]" />
        <h4 className="text-sm font-bold text-[#8b8b8b]">Top Atividades</h4>
      </div>
      {stats.topActivities.length > 0 ? (
        <div className="space-y-3">
          {stats.topActivities.map((act, i) => {
            const percentage = (((act.hours * 60 + act.mins) / stats.totalMinutes) * 100).toFixed(
              1
            );
            const avgDaily = stats.avgPerActivity.find((a) => a.name === act.name)?.avgHours || 0;

            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white ${
                        i === 0
                          ? 'from-yellow-500 to-amber-600'
                          : i === 1
                            ? 'from-gray-400 to-gray-500'
                            : 'from-orange-600 to-orange-700'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-sm font-semibold text-[#8b8b8b] group-hover:text-[#a0a0a0] transition-colors">
                      {act.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#8b8b8b]">
                      {act.hours}h{act.mins > 0 ? ` ${act.mins}m` : ''}
                    </span>
                    <p className="text-[9px] text-[#8b8b8b]/50">{avgDaily}h/dia</p>
                  </div>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r rounded-full transition-all duration-1000 ${
                      i === 0
                        ? 'from-yellow-500 to-amber-600'
                        : i === 1
                          ? 'from-gray-400 to-gray-500'
                          : 'from-orange-600 to-orange-700'
                    }`}
                    style={{ width: animateStats ? `${percentage}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-[10px] text-[#8b8b8b]/50 mt-1 text-right">
                  {percentage}% do total
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[#8b8b8b]/50 text-center py-4">
          Comece o grind e suas conquistas aparecerão aqui! 💪
        </p>
      )}
    </div>
  );
}
