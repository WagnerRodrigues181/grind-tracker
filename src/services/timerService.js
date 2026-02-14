/**
 * Service para operações relacionadas ao timer
 */

import { collection, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Salva atividade registrada pelo timer
 */
export async function saveTimerActivity(activityName, totalSeconds, userId, userEmail, date) {
  const minutes = Math.floor(totalSeconds / 60);

  try {
    await addDoc(collection(db, 'activities', userId, 'entries'), {
      userId,
      userEmail,
      activity: activityName,
      type: 'timed',
      minutes,
      date,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao salvar timer:', error);
    throw error;
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
      await addDoc(collection(db, 'activities', userId, 'entries'), {
        userId,
        userEmail: currentUser.email,
        activity: activityName,
        type: aggregated[activityName]?.type || 'timed',
        minutes: minutesDelta,
        targetMinutes: aggregated[activityName]?.target || null,
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
