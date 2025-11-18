import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import AudioPlayer from './components/audio/AudioPlayer';
import { TimerProvider } from './contexts/TimerContext';

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
        <div className="min-h-screen bg-primary-first">
          <AppContent />
          <AudioPlayer />
        </div>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;
