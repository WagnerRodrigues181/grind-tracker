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

      // Se há ordem salva, aplicar
      if (savedOrder.length > 0) {
        // Ordena os hábitos existentes seguindo savedOrder
        const ordered = savedOrder.filter((h) => habits.includes(h));
        // Adiciona hábitos novos que não estão na ordem salva
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
      // Se não existe, cria com a ordem fornecida
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

    // Atualizar lista de hábitos E a ordem
    await setDoc(configRef, {
      habits: newHabits,
      habitOrder: newHabits, // Mantém a ordem ao adicionar
      updatedAt: serverTimestamp(),
    });

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

    const habits = await getUserHabitsOrdered(userId);

    const updatedHabits = habits.filter((h) => h !== habitName);

    // Remove também da ordem salva
    await setDoc(configRef, {
      habits: updatedHabits,
      habitOrder: updatedHabits,
      updatedAt: serverTimestamp(),
    });

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
