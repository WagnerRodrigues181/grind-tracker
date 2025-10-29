import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Hábitos padrão para novos usuários
const DEFAULT_HABITS = ['Acordar 6h', 'Treino', 'Leitura 30min', 'Dieta', 'Estudar'];

/**
 * Busca a lista de hábitos do usuário
 */
export async function getUserHabits(userId) {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      return configSnap.data().habits || [];
    }

    // Se não existe, cria com hábitos padrão
    await setDoc(configRef, { habits: DEFAULT_HABITS });
    return DEFAULT_HABITS;
  } catch (error) {
    console.error('Erro ao buscar hábitos:', error);
    return [];
  }
}

/**
 * Adiciona um novo hábito com duração padrão
 */
export async function addHabit(userId, habitName, duration = '01:00') {
  try {
    const configRef = doc(db, 'habits', userId, 'config', 'habitsList');
    const durationsRef = doc(db, 'habits', userId, 'config', 'habitsDurations');

    const habits = await getUserHabits(userId);

    if (habits.includes(habitName)) {
      throw new Error('Hábito já existe');
    }

    // Atualizar lista de hábitos
    await setDoc(configRef, { habits: [...habits, habitName] });

    // Armazenar duração do hábito
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

    const habits = await getUserHabits(userId);

    const updatedHabits = habits.filter((h) => h !== habitName);
    await setDoc(configRef, { habits: updatedHabits });

    // Remover duração também
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
      return durations[habitName] || '01:00'; // Retorna 1h como padrão
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
 * Toggle (marca/desmarca) um hábito em um dia específico
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
