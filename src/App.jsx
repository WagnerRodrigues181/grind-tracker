import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';

function AppContent() {
  const { currentUser } = useAuth();

  // Se não estiver logado, mostra Login
  if (!currentUser) {
    return <Login />;
  }

  // Se estiver logado, mostra Dashboard
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
