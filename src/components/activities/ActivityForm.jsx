import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { getToday, timeToMinutes } from '../../utils/dateHelpers';

const PREDEFINED_ACTIVITIES = [
  'Musculação',
  'CrossFit',
  'Estudo',
  'Pesquisa',
  'Rosário (Terço)',
  'Journaling',
  'Leitura',
  'Meditação',
  'Corrida',
  'Outra',
];

export default function ActivityForm({ onActivityAdded }) {
  const { currentUser } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações
    const activityName = selectedActivity === 'Outra' ? customActivity : selectedActivity;

    if (!activityName) {
      setError('Selecione ou digite uma atividade');
      return;
    }

    if (!time) {
      setError('Informe o tempo gasto');
      return;
    }

    // Validar formato do tempo (HH:MM)
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      setError('Formato de tempo inválido. Use HH:MM (ex: 01:30)');
      return;
    }

    try {
      setLoading(true);

      // Converter tempo para minutos
      const minutes = timeToMinutes(time);

      // Salvar no Firestore
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        activity: activityName,
        minutes: minutes,
        date: getToday(),
        createdAt: serverTimestamp(),
      });

      setSuccess('✅ Atividade adicionada com sucesso!');

      // Limpar formulário
      setSelectedActivity('');
      setCustomActivity('');
      setTime('');

      // Notificar componente pai
      if (onActivityAdded) {
        onActivityAdded();
      }

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao adicionar atividade:', err);
      setError('Erro ao adicionar atividade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4">➕ Adicionar Atividade</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletor de Atividade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Atividade</label>
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value="">Selecione uma atividade</option>
            {PREDEFINED_ACTIVITIES.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </div>

        {/* Input customizado (aparece se selecionar "Outra") */}
        {selectedActivity === 'Outra' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Atividade
            </label>
            <input
              type="text"
              placeholder="Digite o nome da atividade"
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>
        )}

        {/* Input de Tempo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (HH:MM)</label>
          <input
            type="text"
            placeholder="01:30"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input-field"
            disabled={loading}
            maxLength={5}
          />
          <p className="text-xs text-gray-500 mt-1">Exemplo: 01:30 (1 hora e 30 minutos)</p>
        </div>

        {/* Mensagens de erro/sucesso */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Adicionar Atividade
            </>
          )}
        </button>
      </form>
    </div>
  );
}
