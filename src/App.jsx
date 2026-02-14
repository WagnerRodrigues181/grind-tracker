import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { ActivitiesProvider } from './contexts/ActivitiesContext';
import AudioPlayer from './components/audio/AudioPlayer';
import ErrorBoundary from './components/ErrorBoundary';

const Login = lazy(() => import('./components/auth/Login'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));

function AppContent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Dashboard />
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TimerProvider>
          <ActivitiesProvider>
            <div className="min-h-screen bg-primary-first">
              <AppContent />
              <AudioPlayer />
            </div>
          </ActivitiesProvider>
        </TimerProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b8b8b] mx-auto mb-4"></div>
        <p className="text-[#8b8b8b] text-sm">Carregando...</p>
      </div>
    </div>
  );
}

export default App;
