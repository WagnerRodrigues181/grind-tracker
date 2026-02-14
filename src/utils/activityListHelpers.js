/**
 * ARQUIVO REFATORADO
 * Agora apenas re-exporta funções dos novos módulos para compatibilidade
 * TODO: Migrar componentes para importar diretamente dos módulos novos
 */

// Imagens
export { ACTIVITY_IMAGES as activityImages, getActivityImage } from './constants/activityImages';

// Agregação
export { aggregateActivities, calculateTotalMinutes } from './aggregators/activityAggregator';

// Services (CRUD movido para services/)
export {
  adjustActivityTime,
  deleteAllActivityEntries,
  saveTimerActivity,
} from '../services/timerService';
export {
  fetchActivityDescription,
  saveActivityDescription,
  deleteActivityDescription,
} from '../services/descriptionsService';

// Debug (mantido aqui por enquanto)
const DEBUG = false;
export function debugLog(section, data) {
  if (!DEBUG) return;
  console.group(`ACTIVITY LIST [${section}]`);
  console.log(data);
  console.trace('Stack trace:');
  console.groupEnd();
}
