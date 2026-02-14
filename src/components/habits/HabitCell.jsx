import { memo } from 'react';

/**
 * Célula individual de check de hábito
 * ✅ Memoizado - evita re-render de 30+ células por vez
 */
function HabitCell({
  habit,
  cellData,
  weekIdx,
  dayIdx,
  pulsingDays,
  particles,
  onToggleDay,
  isChecked,
}) {
  const checked = isChecked(habit, cellData);
  const isCurrent = cellData.belongsTo === 'current';
  const pulseKey = `${habit}-${cellData.day}`;
  const isPulsing = pulsingDays[pulseKey];

  return (
    <td
      className={`px-1 py-2 text-center relative ${dayIdx === 0 ? 'border-l border-[#8b8b8b]/30' : ''}`}
    >
      {/* Partículas */}
      {particles
        .filter((p) => p.habitName === habit && p.day === cellData.day)
        .map((p) => (
          <div
            key={p.id}
            className="particle-effect"
            style={{
              '--tx': `${Math.cos((p.angle * Math.PI) / 180) * 30}px`,
              '--ty': `${Math.sin((p.angle * Math.PI) / 180) * 30}px`,
            }}
          />
        ))}

      {/* Botão */}
      <button
        onClick={isCurrent ? () => onToggleDay(habit, cellData) : undefined}
        disabled={!isCurrent}
        className={`w-5 h-5 rounded-full transition-all duration-200 relative ${isPulsing ? 'pulse-ritual' : ''} ${
          checked
            ? isCurrent
              ? 'bg-gradient-to-br from-[#00C853] to-[#00E676] border-2 border-[#00E676] shadow-lg shadow-green-500/30'
              : 'bg-gradient-to-br from-[#00993d] to-[#00b359] border-2 border-[#00b359]'
            : isCurrent
              ? 'bg-transparent border-2 border-[#8b8b8b]/30 hover:border-[#8b8b8b] hover:bg-[#8b8b8b]/10 hover:scale-110'
              : 'bg-[#1a1a1a] border-2 border-[#1a1a1a]'
        } ${!isCurrent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      />
    </td>
  );
}

// ✅ EXPORTA MEMOIZADO
export default memo(HabitCell);
