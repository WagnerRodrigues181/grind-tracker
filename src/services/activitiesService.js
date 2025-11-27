import { db } from './firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

// ============================================
// ENTRADAS DIÁRIAS DE ATIVIDADES (já existente)
// ============================================
export const addActivityEntry = async (userId, activityData) => {
  return await addDoc(collection(db, 'activities', userId, 'entries'), {
    ...activityData,
    createdAt: serverTimestamp(),
  });
};

// ============================================
// TEMPLATES DE ATIVIDADES PERSONALIZADAS
// ============================================

// Referência para a coleção de atividades personalizadas
const getCustomActivitiesRef = (userId) => collection(db, 'users', userId, 'customActivities');

/**
 * Adiciona um novo template de atividade personalizada
 * @param {string} userId - ID do usuário
 * @param {Object} activityData - Dados da atividade
 * @param {string} activityData.name - Nome da atividade
 * @param {string} activityData.type - Tipo: 'timed' ou 'binary'
 * @param {string} activityData.time - Tempo padrão (ex: "01:30")
 * @param {string} activityData.target - Meta diária (ex: "04:00")
 * @returns {Promise<DocumentReference>}
 */
export const addCustomActivityTemplate = async (userId, { name, type, time = '', target = '' }) => {
  return await addDoc(getCustomActivitiesRef(userId), {
    name,
    type, // 'timed' ou 'binary'
    time, // ex: "01:30"
    target, // ex: "04:00"
    userId,
    createdAt: serverTimestamp(),
  });
};

/**
 * Remove um template de atividade personalizada
 * @param {string} userId - ID do usuário
 * @param {string} templateId - ID do documento do template
 * @returns {Promise<void>}
 */
export const deleteCustomActivityTemplate = async (userId, templateId) => {
  return await deleteDoc(doc(db, 'users', userId, 'customActivities', templateId));
};

/**
 * Listener em tempo real para templates de atividades personalizadas
 * @param {string} userId - ID do usuário
 * @param {Function} callback - Função callback que recebe o array de atividades
 * @returns {Function} - Função unsubscribe para parar o listener
 */
export const onCustomActivitiesSnapshot = (userId, callback) => {
  const q = query(getCustomActivitiesRef(userId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(activities);
  });
};
