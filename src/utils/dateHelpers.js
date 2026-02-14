/**
 * ARQUIVO LEGADO - Mantido para compatibilidade
 * Vou usar os novos módulos em utils/formatters/ para novos códigos
 */

// Re-exporta tudo dos novos módulos
export {
  getToday,
  formatDateDisplay,
  addDays,
  isToday,
  isFuture,
  formatFirebaseTimestamp,
} from './formatters/dateFormatters';

export {
  minutesToTime,
  timeToMinutes,
  formatDuration,
  formatSeconds,
  isValidTimeFormat,
} from './formatters/timeFormatters';
