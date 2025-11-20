import { useState, useEffect } from 'react';
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
import { onCustomActivitiesSnapshot } from '../../services/activitiesService';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  // ESTADO CENTRALIZADO
  const [customActivities, setCustomActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // LISTENER ÚNICO — Não vou mais ter dois ouvindo a mesma coisa
  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomActivities([]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      setCustomActivities(activities);
      setLoadingActivities(false);
    });

    return () => {
      console.log('Dashboard: Limpando listener de atividades personalizadas');
      unsubscribe();
    };
  }, [currentUser]);

  // Função chamada quando uma atividade é adicionada via ActivityForm
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

  // Refresh genérico (os listeners já atualizam tudo sozinho)
  function handleRefresh() {
    console.log('Refresh chamado — Firestore já cuida da atualização automática');
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
              {/* ActivityForm agora recebe os dados centralizados */}
              <div>
                <ActivityForm
                  onActivityAdded={handleActivityAddedFromForm}
                  customActivities={customActivities}
                  loadingActivities={loadingActivities}
                />
              </div>

              <div>
                <HabitsTable onActivityAdded={handleRefresh} />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Modal do Perfil */}
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
