import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Target,
  Edit2,
  Trophy,
  Flame,
  TrendingUp,
  Award,
  Zap,
  Camera,
  Check,
  X,
} from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { timeToMinutes } from '../../utils/dateHelpers';

export default function ProfileCard({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);
  const [isAvgExpanded, setIsAvgExpanded] = useState(false);

  // Estados de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const profileData = {
        displayName: user.displayName || 'Usuário',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: user.metadata.creationTime,
        uid: user.uid,
      };
      setProfile(profileData);
      setEditName(profileData.displayName);
      setEditPhoto(profileData.photoURL || '');

      const statsData = await calculateUserStats(user.uid);
      setStats(statsData);

      setLoading(false);
      setTimeout(() => setAnimateStats(true), 100);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  }

  async function calculateUserStats(userId) {
    try {
      const activitiesRef = collection(db, 'activities', userId, 'entries');
      const q = query(activitiesRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          totalHours: 0,
          totalMinutes: 0,
          topActivities: [],
          weekStreak: 0,
          totalDays: 0,
          avgHoursPerDay: 0,
          bestDay: null,
          avgPerActivity: [],
        };
      }

      const activityMap = {};
      const dayMap = {};
      let totalMinutes = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const date = data.date;
        const activity = data.activity;
        const duration = data.minutes || timeToMinutes(data.duration) || 0;

        totalMinutes += duration;

        if (!activityMap[activity]) activityMap[activity] = 0;
        activityMap[activity] += duration;

        if (!dayMap[date]) dayMap[date] = 0;
        dayMap[date] += duration;
      });

      const topActivities = Object.entries(activityMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, mins]) => ({
          name,
          hours: Math.floor(mins / 60),
          mins: mins % 60,
        }));

      let weekStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      if (dayMap[todayStr] > 0) {
        weekStreak = 1;
        let checkDate = new Date(today);
        for (let i = 1; i <= 365; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = checkDate.toISOString().split('T')[0];
          if (dayMap[dateStr] > 0) {
            weekStreak++;
          } else {
            break;
          }
        }
      }

      const bestDayEntry = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
      const bestDay = bestDayEntry
        ? { date: bestDayEntry[0], hours: Math.floor(bestDayEntry[1] / 60) }
        : null;

      const totalDays = Object.keys(dayMap).length;
      const avgHoursPerDay = totalDays > 0 ? (totalMinutes / 60 / totalDays).toFixed(1) : 0;

      const avgPerActivity = Object.entries(activityMap).map(([name, mins]) => {
        const totalHours = mins / 60;
        const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0.00';
        return { name, avgHours: parseFloat(avgHours) };
      });
      avgPerActivity.sort((a, b) => b.avgHours - a.avgHours);

      return {
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes,
        topActivities,
        weekStreak,
        totalDays,
        avgHoursPerDay: parseFloat(avgHoursPerDay),
        bestDay,
        avgPerActivity,
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        totalHours: 0,
        totalMinutes: 0,
        topActivities: [],
        weekStreak: 0,
        totalDays: 0,
        avgHoursPerDay: 0,
        bestDay: null,
        avgPerActivity: [],
      };
    }
  }

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSave = async () => {
    setError('');
    if (!editName.trim()) {
      setError('Nome não pode ser vazio, guerreiro.');
      return;
    }
    if (editPhoto && !isValidUrl(editPhoto)) {
      setError('URL da foto inválida.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName.trim(),
        photoURL: editPhoto.trim() || null,
      });
      await loadUserData();
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Falha ao salvar. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(profile.displayName);
    setEditPhoto(profile.photoURL || '');
    setIsEditing(false);
    setError('');
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getLevel = (hours) => {
    if (hours >= 1000)
      return { level: 'Legendary', color: 'from-yellow-500 to-amber-600', icon: '👑', next: null };
    if (hours >= 500)
      return { level: 'Master', color: 'from-purple-500 to-pink-600', icon: '⚡', next: 1000 };
    if (hours >= 250)
      return { level: 'Expert', color: 'from-blue-500 to-cyan-600', icon: '🔥', next: 500 };
    if (hours >= 100)
      return { level: 'Advanced', color: 'from-green-500 to-emerald-600', icon: '💪', next: 250 };
    return { level: 'Beginner', color: 'from-gray-500 to-gray-600', icon: '🌱', next: 100 };
  };

  if (loading) {
    return (
      <div className="w-[480px] bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a] rounded-3xl shadow-2xl border border-[#8b8b8b]/20 overflow-hidden">
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-[#8b8b8b]/20 to-[#8b8b8b]/10 rounded-full"></div>
              </div>
              <div className="mt-4 h-6 bg-[#8b8b8b]/20 rounded-lg w-40"></div>
              <div className="mt-2 h-4 bg-[#8b8b8b]/10 rounded w-32"></div>
            </div>
            <div className="space-y-4">
              <div className="h-20 bg-[#8b8b8b]/10 rounded-2xl"></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-[#8b8b8b]/10 rounded-xl"></div>
                <div className="h-16 bg-[#8b8b8b]/10 rounded-xl"></div>
                <div className="h-16 bg-[#8b8b8b]/10 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="w-[480px] bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a] rounded-3xl shadow-2xl border border-[#8b8b8b]/20 overflow-hidden p-8">
        <p className="text-[#8b8b8b] text-center">Erro ao carregar perfil</p>
      </div>
    );
  }

  const levelInfo = getLevel(stats.totalHours);
  const hoursToNext = levelInfo.next ? levelInfo.next - stats.totalHours : 0;

  return (
    <>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(139,139,139,0.3); } 50% { box-shadow: 0 0 40px rgba(139,139,139,0.6); } }
        @keyframes count-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-count-up { animation: count-up 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out 0.3s both; }
        .stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .stat-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(139,139,139,0.3); }
        .trophy-shine { position: relative; overflow: hidden; }
        .trophy-shine::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent); transform: rotate(45deg); animation: shine 3s infinite; }
        @keyframes shine { 0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); } 100% { transform: translateX(100%) translateY(100%) rotate(45deg); } }
      `}</style>

      <div className="w-[480px] bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a] rounded-3xl shadow-2xl border-2 border-[#8b8b8b]/30 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #8b8b8b 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        ></div>
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#8b8b8b]/10 to-transparent"></div>

        <div className="relative z-10 p-8 space-y-6">
          {isEditing ? (
            /* MODO EDIÇÃO */
            <>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {editPhoto ? (
                    <img
                      src={editPhoto}
                      alt="Preview"
                      className="w-28 h-28 rounded-full object-cover border-4 border-[#8b8b8b]/30 shadow-2xl"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/112?text=?';
                      }}
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] flex items-center justify-center text-4xl font-bold text-[#1a1a1a] shadow-2xl">
                      {editName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-2.5 bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] rounded-full text-[#1a1a1a] shadow-lg">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>

                <div className="w-full">
                  <label className="text-xs text-[#8b8b8b]/70 font-semibold mb-1 block">
                    URL da Foto
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#8b8b8b]/20 rounded-xl text-sm text-[#8b8b8b] placeholder-[#8b8b8b]/30 focus:border-[#8b8b8b]/50 focus:outline-none transition-colors"
                  />
                </div>

                <div className="w-full">
                  <label className="text-xs text-[#8b8b8b]/70 font-semibold mb-1 block">
                    Nome de Guerra
                  </label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#252525] border border-[#8b8b8b]/20 rounded-xl text-lg font-bold text-center text-[#8b8b8b] placeholder-[#8b8b8b]/30 focus:border-[#8b8b8b]/50 focus:outline-none transition-colors"
                    maxLength={50}
                  />
                </div>

                {error && (
                  <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400 text-center font-semibold">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 w-full pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-green-600/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 px-5 py-3 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl font-bold text-sm border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* MODO VISUALIZAÇÃO */
            <>
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative animate-float">
                  <div className="absolute inset-0 -m-3">
                    <div
                      className="w-full h-full rounded-full border-2 border-dashed border-[#8b8b8b]/20 animate-spin"
                      style={{ animationDuration: '20s' }}
                    ></div>
                  </div>

                  <div className="relative">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.displayName}
                        className="w-28 h-28 rounded-full object-cover border-4 border-[#8b8b8b]/30 shadow-2xl"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] flex items-center justify-center text-4xl font-bold text-[#1a1a1a] shadow-2xl animate-pulse-glow trophy-shine">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute -bottom-1 -right-1 p-2.5 bg-gradient-to-br from-[#8b8b8b] to-[#6b6b6b] rounded-full text-[#1a1a1a] hover:scale-110 transition-all shadow-lg hover:shadow-xl hover:shadow-[#8b8b8b]/50"
                      title="Editar perfil"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3
                  className="mt-5 text-2xl font-bold text-[#8b8b8b] font-cinzel tracking-wide"
                  style={{ textShadow: '0 0 20px rgba(139,139,139,0.5)' }}
                >
                  {profile.displayName}
                </h3>
                <p className="text-sm text-[#8b8b8b]/60 mt-1">{profile.email}</p>

                <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-[#8b8b8b]/5 rounded-full border border-[#8b8b8b]/20">
                  <Calendar className="w-4 h-4 text-[#8b8b8b]/70" />
                  <span className="text-xs text-[#8b8b8b]/70">
                    Membro desde {formatDateDisplay(profile.createdAt)}
                  </span>
                </div>
              </div>

              {/* HERO CARD COM RANK INTEGRADO */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#8b8b8b]/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                <div className="relative bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-2xl p-6 border-2 border-[#8b8b8b]/30 trophy-shine overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <span className="text-sm font-semibold text-[#8b8b8b]/70">
                        Total Grindado
                      </span>
                    </div>
                    <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <div
                      className={`flex items-baseline gap-3 ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
                    >
                      <span
                        className="text-6xl font-black text-[#8b8b8b] tracking-tighter"
                        style={{ textShadow: '0 0 30px rgba(139,139,139,0.6)' }}
                      >
                        {stats.totalHours.toLocaleString()}
                      </span>
                      <span className="text-3xl font-bold text-[#8b8b8b]/50">horas</span>
                    </div>

                    <div
                      className={`bg-gradient-to-br ${levelInfo.color} px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white font-bold text-sm shadow-lg animate-slide-up`}
                    >
                      <span className="text-lg">{levelInfo.icon}</span>
                      <span>{levelInfo.level}</span>
                    </div>
                  </div>

                  {levelInfo.next && (
                    <div className="mt-3 space-y-1.5 animate-slide-up">
                      <div className="flex justify-between text-xs text-[#8b8b8b]/60">
                        <span>
                          Faltam {hoursToNext}h para {getLevel(levelInfo.next).level}
                        </span>
                        <span className="font-bold">
                          {((stats.totalHours / levelInfo.next) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${levelInfo.color} rounded-full transition-all duration-1000 ease-out`}
                          style={{
                            width: animateStats
                              ? `${(stats.totalHours / levelInfo.next) * 100}%`
                              : '0%',
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats Grid + EXPANSÃO HORIZONTAL */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {/* Streak */}
                  <div className="stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-4 border border-[#8b8b8b]/20 text-center">
                    <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                    <div
                      className={`text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
                    >
                      {stats.weekStreak}
                    </div>
                    <div className="text-[10px] text-[#8b8b8b]/60 font-medium mt-1">Sequência</div>
                  </div>

                  {/* Avg per Day - EXPANDÍVEL */}
                  <div
                    onClick={() => setIsAvgExpanded(!isAvgExpanded)}
                    className={`stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-4 border border-[#8b8b8b]/20 text-center cursor-pointer transition-all duration-300 ${isAvgExpanded ? 'ring-2 ring-green-500/50' : ''}`}
                  >
                    <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
                    <div
                      className={`text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
                    >
                      {stats.avgHoursPerDay}h
                    </div>
                    <div className="text-[10px] text-[#8b8b8b]/60 font-medium mt-1">Média/Dia</div>
                    <div className="mt-2 text-[9px] text-[#8b8b8b]/40">
                      {isAvgExpanded ? '↑ Fechar' : '↓ Detalhes'}
                    </div>
                  </div>

                  {/* Total Days */}
                  <div className="stat-card bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-xl p-4 border border-[#8b8b8b]/20 text-center">
                    <Award className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                    <div
                      className={`text-2xl font-black text-[#8b8b8b] ${animateStats ? 'animate-count-up' : 'opacity-0'}`}
                    >
                      {stats.totalDays}
                    </div>
                    <div className="text-[10px] text-[#8b8b8b]/60 font-medium mt-1">
                      Dias Ativos
                    </div>
                  </div>
                </div>

                {/* EXPANSÃO HORIZONTAL ABAIXO */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isAvgExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-xl p-4 border border-[#8b8b8b]/20 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-green-400" />
                      <h5 className="text-xs font-bold text-[#8b8b8b]/80">
                        Média Diária por Atividade
                      </h5>
                    </div>

                    {stats.avgPerActivity.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {stats.avgPerActivity.map((act, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-[#1a1a1a]/50 px-3 py-2 rounded-lg"
                          >
                            <span className="text-[#8b8b8b]/80 truncate max-w-[120px]">
                              {act.name}
                            </span>
                            <span className="font-mono text-green-400 font-bold">
                              {act.avgHours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#8b8b8b]/40 text-center">
                        Nenhuma atividade registrada.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Activities */}
              <div className="bg-gradient-to-br from-[#252525] to-[#1e1e1e] rounded-2xl p-5 border border-[#8b8b8b]/20">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-[#8b8b8b]" />
                  <h4 className="text-sm font-bold text-[#8b8b8b]">Top Atividades</h4>
                </div>

                {stats.topActivities.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topActivities.map((act, i) => {
                      const percentage = (
                        ((act.hours * 60 + act.mins) / stats.totalMinutes) *
                        100
                      ).toFixed(1);
                      const avgDaily =
                        stats.avgPerActivity.find((a) => a.name === act.name)?.avgHours || 0;
                      return (
                        <div key={i} className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white ${
                                  i === 0
                                    ? 'from-yellow-500 to-amber-600'
                                    : i === 1
                                      ? 'from-gray-400 to-gray-500'
                                      : 'from-orange-600 to-orange-700'
                                }`}
                              >
                                {i + 1}
                              </div>
                              <span className="text-sm font-semibold text-[#8b8b8b] group-hover:text-[#a0a0a0] transition-colors">
                                {act.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-[#8b8b8b]">
                                {act.hours}h{act.mins > 0 ? ` ${act.mins}m` : ''}
                              </span>
                              <p className="text-[9px] text-[#8b8b8b]/50">{avgDaily}h/dia</p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r rounded-full transition-all duration-1000 ${
                                i === 0
                                  ? 'from-yellow-500 to-amber-600'
                                  : i === 1
                                    ? 'from-gray-400 to-gray-500'
                                    : 'from-orange-600 to-orange-700'
                              }`}
                              style={{ width: animateStats ? `${percentage}%` : '0%' }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-[#8b8b8b]/50 mt-1 text-right">
                            {percentage}% do total
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#8b8b8b]/50 text-center py-4">
                    Comece o grind e suas conquistas aparecerão aqui! 💪
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-[#8b8b8b] to-[#6b6b6b] text-[#1a1a1a] rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-[#8b8b8b]/50 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Perfil
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-3 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl font-bold text-sm border border-[#8b8b8b]/30 hover:border-[#8b8b8b]/50 transition-all"
                >
                  Fechar
                </button>
              </div>
            </>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#8b8b8b]/5 to-transparent pointer-events-none"></div>
      </div>
    </>
  );
}
