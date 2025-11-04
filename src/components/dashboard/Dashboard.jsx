import { useState } from 'react';
import Header from '../header/Header';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import Footer from '../Footer';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  async function handleActivityAdded(activityName) {
    if (!currentUser?.uid) return;

    try {
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName,
        minutes: 30, // padrão: 30min por hábito marcado
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD (hoje)
        createdAt: serverTimestamp(),
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Erro ao registrar atividade:', err);
    }
  }

  return (
    <div className="min-h-screen bg-primary-first">
      <Header />

      <main className="w-full px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-8">
          {/* GRÁFICO SEMANAL - DESTAQUE NO TOPO */}
          <div className="w-full">
            <WeeklyAreaChart key={refreshTrigger} />
          </div>

          <div className="w-full">
            <ActivityList refreshTrigger={refreshTrigger} onRefresh={handleActivityAdded} />
          </div>

          {/* FORMULÁRIO + TABELA DE HÁBITOS - LADO A LADO */}
          <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-8">
            <div>
              <ActivityForm onActivityAdded={handleActivityAdded} />
            </div>
            <div>
              <HabitsTable onActivityAdded={handleActivityAdded} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
