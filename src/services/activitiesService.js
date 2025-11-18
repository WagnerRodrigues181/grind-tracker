import { db } from './firebase';
import {
  collection,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

// Coleção onde ficam as entradas diárias (já tava funcionando)
export const addActivityEntry = async (userId, activityData) => {
  return await addDoc(collection(db, 'activities', userId, 'entries'), {
    ...activityData,
    createdAt: serverTimestamp(),
  });
};

// Nova coleção: atividades personalizadas do usuário (templates)
const getCustomActivitiesRef = (userId) => collection(db, 'users', userId, 'customActivities');

export const addCustomActivityTemplate = async (userId, { name, type, time = '', target = '' }) => {
  return await addDoc(getCustomActivitiesRef(userId), {
    name,
    type, // 'timed' ou 'binary'
    time, // ex: "01:30"
    target, // ex: "04:00"
    createdAt: serverTimestamp(),
  });
};

export const deleteCustomActivityTemplate = async (userId, templateId) => {
  return await deleteDoc(doc(db, 'users', userId, 'customActivities', templateId));
};

// Listener em tempo real pras templates
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
