// ============================================
// ACTIVITY LIST HELPERS
// Funções auxiliares para o componente ActivityList
// ============================================

import {
  collection,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ============================================
// DEBUG UTILITIES
// ============================================
const DEBUG = true;

export function debugLog(section, data) {
  if (!DEBUG) return;
  console.group(`ACTIVITY LIST [${section}]`);
  console.log(data);
  console.trace('Stack trace:');
  console.groupEnd();
}

// ============================================
// IMAGENS DAS ATIVIDADES
// ============================================
import pesquisaImg from '../assets/Pesquisa1.webp';
import estudoTecnicoImg from '../assets/EstudoTecnico.webp';
import crossfitImg from '../assets/Crossfit.webp';
import rosarioImg from '../assets/Rosário.webp';
import leituraImg from '../assets/Leitura.webp';
import musculacaoImg from '../assets/Musculação.webp';
import journalImg from '../assets/Journal.webp';
import sonoImg from '../assets/Sono.webp';
import corridaImg from '../assets/Corrida.webp';
import bikeImg from '../assets/Bike.webp';
import dietaCuttingImg from '../assets/Dieta (cutting).webp';
import dietaBulkingImg from '../assets/Dieta (bulking).webp';

export const activityImages = {
  Pesquisa: pesquisaImg,
  'Estudo Técnico': estudoTecnicoImg,
  Crossfit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
  Journal: journalImg,
  Sono: sonoImg,
  Corrida: corridaImg,
  'Dieta (cutting)': dietaCuttingImg,
  'Dieta (bulking)': dietaBulkingImg,
  Bike: bikeImg,
};

export function getActivityImage(activityName) {
  return activityImages[activityName] || null;
}

// ============================================
// AGREGAÇÃO DE ATIVIDADES
// ============================================
export function aggregateActivities(activities, customActivities, timeToMinutes) {
  const agg = {};

  activities.forEach((act) => {
    const name = act.activity;

    // Cria entrada se não existir
    if (!agg[name]) {
      // Busca o template pra saber o tipo (prioridade máxima)
      const template = customActivities.find((c) => c.name === name);
      const type = template?.type || act.type || 'timed'; // fallback seguro

      agg[name] = {
        name,
        type,
        total: 0,
        target: template?.target ? timeToMinutes(template.target) : act.targetMinutes || null,
        entries: [],
      };
    }

    // REGRAS DE SOMA:
    if (agg[name].type === 'binary') {
      // Para binary: não soma tempo, apenas marca como concluído
      // O total fica 0 mas entries.length > 0 indica conclusão
      agg[name].total = 0;
    } else if (act.minutes != null && typeof act.minutes === 'number') {
      // Só soma se for timed e tiver minutos válidos
      agg[name].total += act.minutes;
    }
    // Se for timed mas minutes for undefined → ignora (nunca deve acontecer)

    agg[name].entries.push(act);
  });

  return agg;
}

// ============================================
// AJUSTE DE TEMPO
// Adiciona ou remove tempo de uma atividade
// ============================================
export async function adjustActivityTime(
  activityName,
  minutesDelta,
  aggregated,
  userId,
  currentUser,
  currentDate,
  onRefresh
) {
  try {
    if (minutesDelta < 0) {
      // Remove tempo da última entrada
      const entries = aggregated[activityName]?.entries || [];
      const last = entries[entries.length - 1];
      if (!last || last.minutes + minutesDelta < 0) return;
      await deleteDoc(doc(db, 'activities', userId, 'entries', last.id));
    } else {
      // Adiciona nova entrada com tempo positivo
      await addDoc(collection(db, 'activities', userId, 'entries'), {
        userId,
        userEmail: currentUser.email,
        activity: activityName,
        minutes: minutesDelta,
        date: currentDate,
        createdAt: serverTimestamp(),
      });
    }
    onRefresh?.();
  } catch (error) {
    console.error('Erro ao ajustar tempo:', error);
  }
}

// ============================================
// DELETAR TODAS AS ENTRADAS
// Remove todas as entradas de uma atividade
// ============================================
export async function deleteAllActivityEntries(
  activityName,
  aggregated,
  userId,
  currentDate,
  formatDateDisplay,
  onRefresh
) {
  if (
    !confirm(`Remover TODAS as entradas de "${activityName}" em ${formatDateDisplay(currentDate)}?`)
  )
    return;

  const entries = aggregated[activityName]?.entries || [];
  await Promise.all(entries.map((e) => deleteDoc(doc(db, 'activities', userId, 'entries', e.id))));
  onRefresh?.();
}

// ============================================
// DESCRIÇÕES DE ATIVIDADES
// CRUD de descrições diárias das atividades
// ============================================

// Gera ID único para descrição (userId_data_atividade)
export function makeDescriptionDocId(userId, currentDate, activityName) {
  if (!userId) return null;
  return encodeURIComponent(`${userId}_${currentDate}_${activityName}`);
}

// Busca descrição salva de uma atividade
export async function fetchActivityDescription(userId, currentDate, activityName) {
  const id = makeDescriptionDocId(userId, currentDate, activityName);
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

// Salva descrição de uma atividade
export async function saveActivityDescription(userId, currentDate, activityName, description) {
  const id = makeDescriptionDocId(userId, currentDate, activityName);
  if (!id) throw new Error('Usuário não autenticado');

  try {
    const docRef = doc(db, 'activityDescriptions', id);
    await setDoc(docRef, {
      userId,
      activity: activityName,
      date: currentDate,
      description,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Erro ao salvar descrição:', err);
    throw err;
  }
}

// Remove descrição de uma atividade
export async function deleteActivityDescription(userId, currentDate, activityName) {
  const id = makeDescriptionDocId(userId, currentDate, activityName);
  if (!id) return;

  try {
    const docRef = doc(db, 'activityDescriptions', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao deletar descrição:', err);
  }
}

// ============================================
// TIMER DE ATIVIDADE
// Salva tempo registrado pelo timer
// ============================================
export async function saveTimerActivity(
  activityName,
  totalSeconds,
  userId,
  currentUser,
  currentDate,
  onRefresh
) {
  const minutes = Math.floor(totalSeconds / 60);

  try {
    await addDoc(collection(db, 'activities', userId, 'entries'), {
      userId,
      userEmail: currentUser.email,
      activity: activityName,
      minutes: minutes,
      date: currentDate,
      createdAt: serverTimestamp(),
    });
    onRefresh?.();
  } catch (error) {
    console.error('Erro ao salvar timer:', error);
  }
}
