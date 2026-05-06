/**
 * Linha de estatísticas (Total %) na parte inferior da tabela.
 *
 * MUDANÇA: recebe `visibleWeek` (array de 7 células da semana atual)
 * em vez do `calendar` completo, alinhado com a decisão de exibir
 * apenas uma semana por vez.
 *
 * @param {Array}    visibleWeek    - Array com 7 objetos { day, belongsTo }
 * @param {Array}    habits         - Lista de nomes dos hábitos
 * @param {Object}   fireEmoji      - Mapa de emojis de fogo ativos por dia
 * @param {Function} getDayCompletion - Retorna % de conclusão para uma célula
 */
export default function HabitStats({ visibleWeek, habits, fireEmoji, getDayCompletion }) {
  if (habits.length === 0) return null;

  return (
    <tr className="bg-[#252525] border-t-2 border-[#8b8b8b]/40">
      {/* Label */}
      <td className="sticky left-0 z-10 bg-[#252525] px-2 sm:px-3 py-2 text-[10px] sm:text-[11px] font-bold text-[#8b8b8b] border-r border-[#8b8b8b]/30 habit-name-cell">
        Total %
      </td>

      {visibleWeek.map((cellData, dayIdx) => {
        const completion = getDayCompletion(cellData);

        const colorClass =
          completion >= 80 ? 'bg-green-500' : completion >= 50 ? 'bg-yellow-500' : 'bg-red-500';

        const fireKey = `fire-${cellData.day}`;
        const showFire = fireEmoji[fireKey] && cellData.belongsTo === 'current';

        return (
          <td
            key={`stat-${cellData.belongsTo}-${cellData.day}-${dayIdx}`}
            className="day-col px-1 py-2 text-center relative"
          >
            {showFire && <div className="fire-emoji">🔥</div>}

            <div
              className={`w-6 h-6 mx-auto flex items-center justify-center text-[9px] font-bold text-white ${colorClass} rounded-md shadow-lg relative overflow-hidden`}
            >
              {completion >= 80 && (
                <div className="absolute inset-0 border-2 border-[#8b8b8b]/40 rounded-md rotating-ring" />
              )}
              <span className="relative z-10">{completion}%</span>
            </div>
          </td>
        );
      })}

      {/* Coluna vazia alinhada ao botão remover */}
      <td className="sticky right-0 z-10 bg-[#252525] border-l border-[#8b8b8b]/30 w-8" />
    </tr>
  );
}
