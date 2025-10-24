// Formatar data para string YYYY-MM-DD
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obter data de hoje no formato YYYY-MM-DD
export function getToday() {
  return formatDate(new Date());
}

// Formatar data para exibição (ex: "24 de Outubro")
export function formatDateDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

// Converter tempo no formato HH:MM para minutos
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Converter minutos para formato HH:MM
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Formatar minutos para exibição (ex: "1h 30min")
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}
