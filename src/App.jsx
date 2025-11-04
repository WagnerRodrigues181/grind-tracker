import { AuthProvider, useAuth } from './contexts/AuthContext';
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
      <div className="min-h-screen bg-primary-first">
        <AppContent />
        <AudioPlayer />
      </div>
    </AuthProvider>
  );
}

export default App;
