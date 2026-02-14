import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { ActivitiesProvider } from './contexts/ActivitiesContext'; // ← NOVO
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import AudioPlayer from './components/audio/AudioPlayer';

function AppContent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <ActivitiesProvider>
          {' '}
          {/* ← NOVO */}
          <div className="min-h-screen bg-primary-first">
            <AppContent />
            <AudioPlayer />
          </div>
        </ActivitiesProvider>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;
