import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Hábitos padrão para novos usuários
const DEFAULT_HABITS = ['Acordar 6h', 'Treino', 'Leitura 30min', 'Dieta', 'Estudar'];

/**
 * Busca a lista de hábitos do usuário RESPEITANDO A ORDEM
 */
export async function getUserHabits(userId) {
  return getUserHabitsOrdered(userId);
}

/**
 * Carrega hábitos respeitando a ordem salva
 */
export async function getUserHabitsOrdered(userId) {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      const habits = data.habits || [];
      const savedOrder = data.habitOrder || [];

      if (savedOrder.length > 0) {
        const ordered = savedOrder.filter((h) => habits.includes(h));
        const newHabits = habits.filter((h) => !savedOrder.includes(h));
        return [...ordered, ...newHabits];
      }

      return habits;
    }

    // Se não existe, cria com hábitos padrão
    await setDoc(configRef, { habits: DEFAULT_HABITS, habitOrder: DEFAULT_HABITS });
    return DEFAULT_HABITS;
  } catch (error) {
    console.error('Erro ao buscar hábitos:', error);
    return [];
  }
}

/**
 * Atualiza a ordem dos hábitos do usuário
 */
export async function updateHabitsOrder(userId, orderedHabitNames) {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      await updateDoc(configRef, {
        habitOrder: orderedHabitNames,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(configRef, {
        habits: orderedHabitNames,
        habitOrder: orderedHabitNames,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar ordem:', error);
    throw error;
  }
}

/**
 * Adiciona um novo hábito com duração padrão
 */
export async function addHabit(userId, habitName, duration = '01:00') {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const durationsRef = doc(db, 'habits', userId, 'config', 'habitsDurations');

    const habits = await getUserHabitsOrdered(userId);

    if (habits.includes(habitName)) {
      throw new Error('Hábito já existe');
    }

    const newHabits = [...habits, habitName];

    await setDoc(configRef, {
      habits: newHabits,
      habitOrder: newHabits,
      updatedAt: serverTimestamp(),
    });

    const durationsSnap = await getDoc(durationsRef);
    const currentDurations = durationsSnap.exists() ? durationsSnap.data() : {};

    await setDoc(durationsRef, {
      ...currentDurations,
      [habitName]: duration,
    });

    return true;
  } catch (error) {
    console.error('Erro ao adicionar hábito:', error);
    throw error;
  }
}

/**
 * Remove um hábito
 */
export async function removeHabit(userId, habitName) {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const durationsRef = doc(db, 'habits', userId, 'config', 'habitsDurations');

    const habits = await getUserHabitsOrdered(userId);
    const updatedHabits = habits.filter((h) => h !== habitName);

    await setDoc(configRef, {
      habits: updatedHabits,
      habitOrder: updatedHabits,
      updatedAt: serverTimestamp(),
    });

    const durationsSnap = await getDoc(durationsRef);
    if (durationsSnap.exists()) {
      const currentDurations = durationsSnap.data();
      delete currentDurations[habitName];
      await setDoc(durationsRef, currentDurations);
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover hábito:', error);
    throw error;
  }
}

/**
 * Busca a duração padrão de um hábito
 */
export async function getHabitDuration(userId, habitName) {
  try {
    const durationsRef = doc(db, 'habits', userId, 'config', 'habitsDurations');
    const durationsSnap = await getDoc(durationsRef);

    if (durationsSnap.exists()) {
      const durations = durationsSnap.data();
      return durations[habitName] || '01:00';
    }

    return '01:00';
  } catch (error) {
    console.error('Erro ao buscar duração do hábito:', error);
    return '01:00';
  }
}

/**
 * Busca tracking de hábitos de um mês específico
 */
export async function getMonthTracking(userId, year, month) {
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const trackingRef = doc(db, 'habits', userId, 'tracking', yearMonth);
    const trackingSnap = await getDoc(trackingRef);

    return trackingSnap.exists() ? trackingSnap.data() : {};
  } catch (error) {
    console.error('Erro ao buscar tracking:', error);
    return {};
  }
}

/**
 * Toggle um hábito em um dia específico
 */
export async function toggleHabitDay(userId, year, month, day, habitName) {
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const dayKey = String(day).padStart(2, '0');
    const trackingRef = doc(db, 'habits', userId, 'tracking', yearMonth);

    const trackingSnap = await getDoc(trackingRef);
    const currentData = trackingSnap.exists() ? trackingSnap.data() : {};

    const habitData = currentData[habitName] || {};
    const newValue = !habitData[dayKey];

    if (newValue) {
      habitData[dayKey] = true;
    } else {
      delete habitData[dayKey];
    }

    await setDoc(trackingRef, {
      ...currentData,
      [habitName]: habitData,
    });

    return newValue;
  } catch (error) {
    console.error('Erro ao toggle hábito:', error);
    throw error;
  }
}

/**
 * Marca um hábito como feito em um dia específico (sem toggle — só seta true)
 * Usado para sincronizar quando a atividade é adicionada pelo ActivityForm ou ActivityList
 */
export async function markHabitDay(userId, year, month, day, habitName) {
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const dayKey = String(day).padStart(2, '0');
    const trackingRef = doc(db, 'habits', userId, 'tracking', yearMonth);

    const trackingSnap = await getDoc(trackingRef);
    const currentData = trackingSnap.exists() ? trackingSnap.data() : {};

    // Só escreve se ainda não estiver marcado (evita write desnecessário)
    const habitData = currentData[habitName] || {};
    if (habitData[dayKey] === true) return;

    await setDoc(trackingRef, {
      ...currentData,
      [habitName]: {
        ...habitData,
        [dayKey]: true,
      },
    });
  } catch (error) {
    console.error('Erro ao marcar hábito:', error);
    // Não propaga: falha silenciosa pra não quebrar o fluxo principal
  }
}

/**
 * Sincroniza hábito a partir de uma atividade adicionada.
 * Se o nome da atividade bater com um hábito existente, marca o dia automaticamente.
 *
 * @param {string} userId
 * @param {string} activityName - Nome da atividade adicionada
 * @param {string} dateString   - Data no formato "YYYY-MM-DD"
 */
export async function syncHabitFromActivity(userId, activityName, dateString) {
  try {
    const habits = await getUserHabitsOrdered(userId);

    // Comparação case-insensitive + trim para robustez
    const normalizedName = activityName.trim().toLowerCase();
    const matchingHabit = habits.find((h) => h.trim().toLowerCase() === normalizedName);

    if (!matchingHabit) return; // Não é um hábito, nada a fazer

    const [year, month, day] = dateString.split('-').map(Number);
    await markHabitDay(userId, year, month, day, matchingHabit);
  } catch (error) {
    console.error('Erro ao sincronizar hábito com atividade:', error);
    // Falha silenciosa: não quebra o submit principal
  }
}
