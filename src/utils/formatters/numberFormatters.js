/**
 * Formatadores de números
 */

/**
 * Formata porcentagem
 */
export function formatPercentage(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formata número com separador de milhares
 */
export function formatNumber(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  return value.toLocaleString('pt-BR');
}

/**
 * Calcula progresso em %
 */
export function calculateProgress(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

/**
 * Arredonda para 2 casas decimais
 */
export function roundTo2Decimals(value) {
  return Math.round(value * 100) / 100;
}
