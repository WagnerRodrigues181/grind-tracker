import { useState, useEffect } from 'react';
import Header from '../header/Header';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import Footer from '../Footer';
import ProfileCard from '../profile/ProfileCard';
import { onCustomActivitiesSnapshot } from '../../services/activitiesService';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  // ESTADO CENTRALIZADO
  const [customActivities, setCustomActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // LISTENER ÚNICO
  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomActivities([]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);

    const unsubscribe = onCustomActivitiesSnapshot(currentUser.uid, (activities) => {
      console.log('✅ Dashboard: Atividades carregadas:', activities);
      setCustomActivities(activities);
      setLoadingActivities(false);
    });

    return () => {
      console.log('Dashboard: Limpando listener de atividades personalizadas');
      unsubscribe();
    };
  }, [currentUser]);

  function handleActivityAddedFromForm() {
    console.log(
      '✅ Dashboard: Atividade adicionada via ActivityForm (listener atualiza automaticamente)'
    );
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="relative w-full max-w-lg transform scale-90 origin-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileCard onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </>
  );
}
