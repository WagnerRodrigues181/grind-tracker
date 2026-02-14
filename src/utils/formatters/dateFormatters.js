/**
 * Formatadores de data
 */

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 */
export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';

  // Se for timestamp do Firebase
  if (typeof dateStr === 'object' && dateStr.seconds) {
    const date = new Date(dateStr.seconds * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Se for string YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Fallback: tenta criar Date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Adiciona dias a uma data
 */
export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Verifica se é hoje
 */
export function isToday(dateStr) {
  return dateStr === getToday();
}

/**
 * Verifica se é data futura
 */
export function isFuture(dateStr) {
  const date = new Date(dateStr);
  const today = new Date(getToday());
  return date > today;
}

/**
 * Formata timestamp do Firebase para string legível
 */
export function formatFirebaseTimestamp(timestamp) {
  if (!timestamp || !timestamp.seconds) return '';

  const date = new Date(timestamp.seconds * 1000);
  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
