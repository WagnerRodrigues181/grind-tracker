export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday() {
  return formatDate(new Date());
}

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

export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function getWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return formatDate(date);
}

export function getWeekEnd(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  date.setDate(date.getDate() + (6 - day));
  return formatDate(date);
}

export function getMonthStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(1);
  return formatDate(date);
}

export function getMonthEnd(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return formatDate(date);
}

export function getWeekDays(dateStr) {
  const start = getWeekStart(dateStr);
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export function getDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}

export function getMonthName(dateStr) {
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
  return months[date.getMonth()];
}

export function isToday(dateStr) {
  return dateStr === getToday();
}

export function isFuture(dateStr) {
  return dateStr > getToday();
}
