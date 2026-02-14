/**
 * Linha de estatísticas (Total % e 🔥)
 */
export default function HabitStats({ calendar, habits, fireEmoji, getDayCompletion }) {
  if (habits.length === 0) return null;

  return (
    <tr className="bg-[#252525] border-t-2 border-[#8b8b8b]/40">
      <td className="sticky left-0 z-10 bg-[#252525] px-3 py-2 text-[11px] font-bold text-[#8b8b8b] border-r border-[#8b8b8b]/30 habit-name-cell">
        Total %
      </td>
      {calendar.weeks.map((week, weekIdx) =>
        week.map((cellData, dayIdx) => {
          const completion = getDayCompletion(cellData);
          const colorClass =
            completion >= 80 ? 'bg-green-500' : completion >= 50 ? 'bg-yellow-500' : 'bg-red-500';
          const fireKey = `fire-${cellData.day}`;
          const showFire = fireEmoji[fireKey] && cellData.belongsTo === 'current';

          return (
            <td
              key={`${weekIdx}-${dayIdx}`}
              className={`px-1 py-2 text-center relative ${dayIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
            >
              {showFire && <div className="fire-emoji">🔥</div>}
              <div
                className={`w-6 h-6 mx-auto flex items-center justify-center text-[9px] font-bold text-white ${colorClass} rounded-md shadow-lg relative overflow-hidden`}
              >
                {completion >= 80 && (
                  <div className="absolute inset-0 border-2 border-[#8b8b8b]/40 rounded-md rotating-ring"></div>
                )}
                <span className="relative z-10">{completion}%</span>
              </div>
            </td>
          );
        })
      )}
      <td className="sticky right-0 z-10 bg-[#252525] border-l border-[#8b8b8b]/30"></td>
    </tr>
  );
}
