/**
 * Service para gerenciar descrições de atividades
 */

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Gera ID único para descrição (userId_data_atividade)
 */
function makeDescriptionDocId(userId, date, activityName) {
  if (!userId) return null;
  return encodeURIComponent(`${userId}_${date}_${activityName}`);
}

/**
 * Busca descrição salva de uma atividade
 */
export async function fetchActivityDescription(userId, date, activityName) {
  const id = makeDescriptionDocId(userId, date, activityName);
  if (!id) return '';

  try {
    const docRef = doc(db, 'activityDescriptions', id);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return data.description || '';
    }
    return '';
  } catch (err) {
    console.error('Erro ao buscar descrição:', err);
    return '';
  }
}

/**
 * Salva descrição de uma atividade
 */
export async function saveActivityDescription(userId, date, activityName, description) {
  const id = makeDescriptionDocId(userId, date, activityName);
  if (!id) throw new Error('Usuário não autenticado');

  try {
    const docRef = doc(db, 'activityDescriptions', id);
    await setDoc(docRef, {
      userId,
      activity: activityName,
      date,
      description,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Erro ao salvar descrição:', err);
    throw err;
  }
}

/**
 * Remove descrição de uma atividade
 */
export async function deleteActivityDescription(userId, date, activityName) {
  const id = makeDescriptionDocId(userId, date, activityName);
  if (!id) return;

  try {
    const docRef = doc(db, 'activityDescriptions', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao deletar descrição:', err);
    throw err;
  }
}
