/**
 * Retorna o número de dias em um mês
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Retorna o nome do mês em português
 */
export function getMonthName(month) {
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return months[month - 1];
}

/**
 * Calcula a porcentagem de conclusão de um hábito
 */
export function calculateHabitPercentage(habitData, totalDays) {
  if (!habitData) return 0;
  const completedDays = Object.keys(habitData).length;
  return Math.round((completedDays / totalDays) * 100);
}

/**
 * Retorna a classe de cor baseada na porcentagem
 */
export function getPercentageColor(percentage) {
  if (percentage >= 80) return 'bg-green-100 text-green-800 border-green-200';
  if (percentage >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (percentage >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}
