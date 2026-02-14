/**
 * Validadores de tempo e atividades
 */

/**
 * Valida formato HH:MM
 */
export function validateTimeFormat(time) {
  if (!time) return { valid: false, error: 'Tempo não pode ser vazio' };

  const regex = /^([0-9]{1,2}):([0-5][0-9])$/;
  if (!regex.test(time)) {
    return { valid: false, error: 'Formato inválido. Use HH:MM (ex: 01:30)' };
  }

  return { valid: true, error: null };
}

/**
 * Valida dados de atividade antes de salvar
 */
export function validateActivityData(data) {
  const errors = [];

  if (!data.activity || !data.activity.trim()) {
    errors.push('Nome da atividade é obrigatório');
  }

  if (data.type === 'timed') {
    if (data.minutes == null || data.minutes <= 0) {
      errors.push('Duração deve ser maior que zero');
    }
  }

  if (data.targetMinutes != null && data.targetMinutes < 0) {
    errors.push('Meta não pode ser negativa');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida nome de atividade
 */
export function validateActivityName(name) {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Nome não pode ser vazio' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Nome muito longo (máximo 50 caracteres)' };
  }

  return { valid: true, error: null };
}
