import { auth, db } from './services/firebase';
import { useEffect, useState } from 'react';

function App() {
  const [firebaseStatus, setFirebaseStatus] = useState('Conectando...');

  useEffect(() => {
    if (auth && db) {
      setFirebaseStatus('✅ Firebase conectado com sucesso!');
    } else {
      setFirebaseStatus('❌ Erro ao conectar Firebase');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔥 Grind Tracker</h1>
          <p className="text-gray-600 text-lg">
            Wagner & Marlon - Rumo à disciplina e consistência
          </p>
          <div className="mt-8 card max-w-md mx-auto">
            <p className="text-gray-700 font-medium mb-2">Status Firebase:</p>
            <p
              className={`text-lg ${firebaseStatus.includes('✅') ? 'text-green-600' : 'text-orange-600'}`}
            >
              {firebaseStatus}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
