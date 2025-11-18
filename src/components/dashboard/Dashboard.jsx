import { useState } from 'react';
import Header from '../header/Header';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import Footer from '../Footer';
import ProfileCard from '../profile/ProfileCard';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  async function handleActivityAddedFromForm(activityName) {
    if (!currentUser?.uid || !activityName?.trim()) {
      console.warn('Atividade inválida ou usuário não logado');
      return;
    }

    try {
      const entriesRef = collection(db, 'activities', currentUser.uid, 'entries');

      await addDoc(entriesRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName.trim(),
        minutes: 30,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      console.log('Atividade salva com sucesso:', activityName);
    } catch (err) {
      console.error('Erro ao salvar atividade:', err);
    }
  }

  function handleRefresh() {
    console.log('🔄 Refresh chamado (listeners já cuidam da atualização)');
    // o Firestore onSnapshot já atualiza automaticamente
  }

  return (
    <>
      <div className="min-h-screen bg-primary-first">
        <Header setShowProfile={setShowProfile} />

        <main className="w-full px-8 py-8">
          <div className="max-w-[1800px] mx-auto space-y-8">
            <div className="w-full">
              <WeeklyAreaChart />
            </div>

            <div className="w-full">
              <ActivityList onRefresh={handleRefresh} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-8">
              <div>
                <ActivityForm onActivityAdded={handleActivityAddedFromForm} />
              </div>
              <div>
                <HabitsTable onActivityAdded={handleRefresh} />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {showProfile && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center pt-24 px-4 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowProfile(false)}
        >
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <ProfileCard onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </>
  );
}
