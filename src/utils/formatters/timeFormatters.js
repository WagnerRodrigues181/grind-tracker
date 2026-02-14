/**
 * Formatadores de tempo
 */

/**
 * Converte minutos para formato HH:MM
 */
export function minutesToTime(minutes) {
  if (!minutes || minutes <= 0) return '00:00';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converte formato HH:MM para minutos
 */
export function timeToMinutes(time) {
  if (!time) return 0;

  const parts = time.split(':');
  if (parts.length !== 2) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  return hours * 60 + minutes;
}

/**
 * Formata duração em minutos para string legível
 * Ex: 90 min → "1h 30min"
 */
export function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0min';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

/**
 * Formata segundos para HH:MM:SS
 */
export function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Valida formato de tempo HH:MM
 */
export function isValidTimeFormat(time) {
  if (!time) return false;
  const regex = /^([0-9]{1,2}):([0-5][0-9])$/;
  return regex.test(time);
}
