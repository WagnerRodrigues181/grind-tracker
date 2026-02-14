import { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import HabitCell from './HabitCell';

/**
 * Linha individual de hábito (arrastável)
 * ✅ Memoizado - ou seja, só re-renderiza se props mudarem
 */
function HabitRow({ habit, calendar, pulsingDays, particles, onToggleDay, onRemove, isChecked }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-[#8b8b8b]/20 hover:bg-[#252525]/40 transition-all duration-200 habit-row"
    >
      {/* Coluna do nome */}
      <td className="sticky left-0 z-10 bg-[#1a1a1a] hover:bg-[#252525]/40 border-r border-[#8b8b8b]/30 habit-name-cell">
        <div className="habit-name-container">
          <button
            {...attributes}
            {...listeners}
            className="grip-icon cursor-grab active:cursor-grabbing text-[#8b8b8b]/50 hover:text-[#8b8b8b] transition-colors flex-shrink-0"
            title="Arraste para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="habit-name-text" title={habit}>
            {habit}
          </span>
        </div>
      </td>

      {/* Dias */}
      {calendar.weeks.map((week, weekIdx) =>
        week.map((cellData, dayIdx) => (
          <HabitCell
            key={`${weekIdx}-${dayIdx}`}
            habit={habit}
            cellData={cellData}
            weekIdx={weekIdx}
            dayIdx={dayIdx}
            pulsingDays={pulsingDays}
            particles={particles}
            onToggleDay={onToggleDay}
            isChecked={isChecked}
          />
        ))
      )}

      {/* Botão remover */}
      <td className="sticky right-0 z-10 bg-[#1a1a1a] hover:bg-[#252525]/40 border-l border-[#8b8b8b]/30">
        <button
          onClick={() => onRemove(habit)}
          className="p-1 text-red-400 hover:text-red-300 rounded transition-all duration-200 trash-hover"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ✅ EXPORTA MEMOIZADO
export default memo(HabitRow);
