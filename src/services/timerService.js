/**
 * Service para operações relacionadas ao timer
 */

import {
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Salva atividade registrada pelo timer
 * Agora com logging e tratamento de erro robusto
 */
export async function saveTimerActivity(activityName, totalSeconds, userId, userEmail, date) {
  const minutes = Math.floor(totalSeconds / 60);

  console.log('[Timer] Salvando atividade:', { activityName, totalSeconds, minutes, userId, date });

  try {
    // Opcional: busca se já existe meta (target) para esta atividade neste dia
    let targetMinutes = null;
    try {
      const activitiesRef = collection(db, 'activities', userId, 'entries');
      const q = query(
        activitiesRef,
        where('date', '==', date),
        where('activity', '==', activityName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Pega o targetMinutes da primeira entrada (todas devem ter o mesmo target para o dia)
        targetMinutes = snapshot.docs[0].data().targetMinutes || null;
        console.log('[Timer] Meta encontrada para o dia:', targetMinutes);
      }
    } catch (err) {
      console.warn('[Timer] Não foi possível buscar meta existente:', err);
      // Continua mesmo sem meta
    }

    // Adiciona a entrada
    const entryData = {
      userId,
      userEmail,
      activity: activityName,
      type: 'timed',
      minutes,
      targetMinutes,
      target: targetMinutes, // campo redundante para compatibilidade
      date,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'activities', userId, 'entries'), entryData);
    console.log('[Timer] Atividade salva com sucesso! ID:', docRef.id);
  } catch (error) {
    console.error('[Timer] Erro ao salvar atividade do timer:', error);
    throw error; // Repassa o erro para ser tratado no callback
  }
}

/**
 * Ajusta tempo de uma atividade (adiciona ou remove)
 */
export async function adjustActivityTime(
  activityName,
  minutesDelta,
  aggregated,
  userId,
  currentUser,
  currentDate
) {
  try {
    if (minutesDelta < 0) {
      // Removendo tempo
      const entries = aggregated[activityName]?.entries || [];
      const last = entries[entries.length - 1];

      if (!last) return;

      const newMinutes = (last.minutes || 0) + minutesDelta;

      if (newMinutes <= 0) {
        await deleteDoc(doc(db, 'activities', userId, 'entries', last.id));
      } else {
        const entryRef = doc(db, 'activities', userId, 'entries', last.id);
        await setDoc(
          entryRef,
          {
            ...last,
            minutes: newMinutes,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } else {
      // Adicionando tempo
      // Buscar target existente para manter consistência
      const existingTarget = aggregated[activityName]?.target || null;

      await addDoc(collection(db, 'activities', userId, 'entries'), {
        userId,
        userEmail: currentUser.email,
        activity: activityName,
        type: aggregated[activityName]?.type || 'timed',
        minutes: minutesDelta,
        targetMinutes: existingTarget,
        target: existingTarget,
        date: currentDate,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Erro ao ajustar tempo:', error);
    throw error;
  }
}

/**
 * Deleta todas as entradas de uma atividade em um dia
 */
export async function deleteAllActivityEntries(activityName, aggregated, userId) {
  const entries = aggregated[activityName]?.entries || [];

  try {
    await Promise.all(
      entries.map((e) => deleteDoc(doc(db, 'activities', userId, 'entries', e.id)))
    );
  } catch (error) {
    console.error('Erro ao deletar entradas:', error);
    throw error;
  }
}
