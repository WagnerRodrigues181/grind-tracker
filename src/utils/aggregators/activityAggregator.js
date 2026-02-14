/**
 * Agregador de atividades
 * Responsável por agrupar atividades por nome e calcular totais
 */

/**
 * Agrega atividades do dia em um objeto organizado
 * @param {Array} activities - Lista de atividades do Firestore
 * @param {Array} customActivities - Templates de atividades personalizadas
 * @param {Function} timeToMinutes - Função para converter tempo em minutos
 * @returns {Object} Objeto com atividades agregadas
 */
export function aggregateActivities(activities, customActivities, timeToMinutes) {
  const agg = {};

  activities.forEach((act) => {
    const name = act.activity;

    if (!agg[name]) {
      const template = customActivities.find((c) => c.name === name);
      const type = template?.type || act.type || 'timed';

      agg[name] = {
        name,
        type,
        total: 0,
        target: null,
        entries: [],
      };
    }

    // Atualiza o target SEMPRE com o valor mais recente
    if (act.targetMinutes != null) {
      agg[name].target = act.targetMinutes;
    } else if (agg[name].target === null) {
      // Se não tem target na entry, tenta pegar do template
      const template = customActivities.find((c) => c.name === name);
      if (template?.target) {
        agg[name].target = timeToMinutes(template.target);
      }
    }

    // Soma apenas se for timed
    if (agg[name].type === 'binary') {
      agg[name].total = 0; // Binary não acumula tempo
    } else if (act.minutes != null && typeof act.minutes === 'number') {
      agg[name].total += act.minutes;
    }

    agg[name].entries.push(act);
  });

  return agg;
}

/**
 * Calcula total de minutos de um array de atividades
 * (ignora atividades binary)
 */
export function calculateTotalMinutes(activities) {
  return activities.reduce((total, act) => {
    if (act.type === 'binary') return total;
    if (typeof act.minutes === 'number') {
      return total + act.minutes;
    }
    return total;
  }, 0);
}

/**
 * Filtra atividades por tipo
 */
export function filterActivitiesByType(activities, type) {
  return activities.filter((act) => act.type === type);
}

/**
 * Agrupa atividades por data
 */
export function groupActivitiesByDate(activities) {
  const grouped = {};

  activities.forEach((act) => {
    if (!grouped[act.date]) {
      grouped[act.date] = [];
    }
    grouped[act.date].push(act);
  });

  return grouped;
}
