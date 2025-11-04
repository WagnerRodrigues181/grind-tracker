import { useEffect, useState } from 'react';
import { User, Calendar, Clock, Target, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatDateDisplay } from '../../utils/dateHelpers'; // <--- USE ISSO

export default function ProfileCard({ onClose, onEdit }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser?.uid) return;

      try {
        // 1. Perfil customizado
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists()
          ? profileSnap.data()
          : {
              displayName: currentUser.email.split('@')[0],
              photoURL: null,
              createdAt: new Date().toISOString(), // fallback
            };

        // 2. Stats de atividades
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(activitiesQuery);

        const activities = snapshot.docs.map((d) => d.data());
        const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0);
        const totalHours = Math.floor(totalMinutes / 60);

        // Top 3 atividades
        const activityCount = {};
        activities.forEach((a) => {
          activityCount[a.activity] = (activityCount[a.activity] || 0) + a.minutes;
        });
        const topActivities = Object.entries(activityCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, mins]) => ({ name, hours: Math.floor(mins / 60), mins: mins % 60 }));

        setProfile(profileData);
        setStats({ totalHours, topActivities });
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="w-80 p-6 bg-primary-second rounded-xl shadow-2xl border border-primary-accent/10">
        <div className="animate-pulse">
          <div className="h-20 w-20 bg-primary-accent/20 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-primary-accent/20 rounded w-48 mx-auto mb-2"></div>
          <div className="h-3 bg-primary-accent/10 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-6 bg-primary-second rounded-xl shadow-2xl border border-primary-accent/10 space-y-5">
      {/* Avatar + Nome */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-primary-accent/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-accent flex items-center justify-center text-2xl font-bold text-primary-first">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={onEdit}
            className="absolute bottom-0 right-0 p-1.5 bg-primary-accent rounded-full text-primary-first hover:scale-110 transition-all"
            title="Editar foto"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <h3 className="mt-3 text-lg font-bold text-primary-accent font-cinzel">
          {profile.displayName}
        </h3>
        <p className="text-sm text-primary-accent/70">{currentUser.email}</p>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-primary-accent/70">
            <Calendar className="w-4 h-4" />
            <span>Membro desde</span>
          </div>
          <span className="font-medium text-primary-accent">
            {formatDateDisplay(profile.createdAt.split('T')[0])}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-primary-accent/70">
            <Clock className="w-4 h-4" />
            <span>Total grindado</span>
          </div>
          <span className="font-bold text-primary-accent">{stats.totalHours}h</span>
        </div>

        <div className="pt-2 border-t border-primary-accent/10">
          <p className="text-xs text-primary-accent/60 mb-2 flex items-center gap-1">
            <Target className="w-3 h-3" />
            Top atividades
          </p>
          {stats.topActivities.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {stats.topActivities.map((act, i) => (
                <li key={i} className="flex justify-between text-primary-accent/80">
                  <span>{act.name}</span>
                  <span className="font-medium">
                    {act.hours}h{act.mins > 0 ? ` ${act.mins}m` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-primary-accent/50">Nenhuma atividade ainda</p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-3 border-t border-primary-accent/10">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-xs bg-primary-accent/10 text-primary-accent rounded-lg hover:bg-primary-accent/20 transition-colors"
        >
          Editar Perfil
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-3 py-1.5 text-xs bg-primary-accent/10 text-primary-accent rounded-lg hover:bg-primary-accent/20 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
