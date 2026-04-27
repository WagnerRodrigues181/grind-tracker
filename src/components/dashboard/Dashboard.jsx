import { useState } from 'react';
import Header from '../header/Header';
import ActivityForm from '../activities/ActivityForm';
import ActivityList from '../activities/ActivityList';
import WeeklyAreaChart from '../charts/WeeklyAreaChart';
import HabitsTable from '../habits/HabitsTable';
import Footer from '../Footer';
import ProfileCard from '../profile/ProfileCard';

export default function Dashboard() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-primary-first">
        <Header setShowProfile={setShowProfile} />

        <main className="w-full px-8 py-8">
          <div className="max-w-[1800px] mx-auto space-y-8">
            {/* Gráfico Semanal */}
            <div className="w-full">
              <WeeklyAreaChart />
            </div>

            {/* Lista de Atividades */}
            <div className="w-full">
              <ActivityList />
            </div>

            {/* Form + Tabela de Hábitos */}
            <div className="w-full">
              <HabitsTable />
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
