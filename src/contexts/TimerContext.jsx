import { useState, useEffect, useRef, createContext, useContext } from 'react';

const TimerContext = createContext(null);

// Chave do localStorage APENAS para timers sem callback (não usado na UI)
const STORAGE_KEY = 'grindtracker_active_timer';

export function TimerProvider({ children }) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const intervalRef = useRef(null);
  const notificationRef = useRef(null);

  // Solicitar permissão de notificação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ⚠️ NÃO restaurar timers com callback (UI) para evitar perda do callback
  // Apenas timers "sistema" (sem callback) seriam restaurados, mas atualmente nenhum é criado assim
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Se o timer salvo tem onComplete, ignoramos porque não pode ser restaurado
        if (data.hasCallback) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
        const remaining = data.totalSeconds - elapsed;
        if (remaining > 0 && !data.hasCallback) {
          setActiveTimer({
            activityName: data.activityName,
            totalSeconds: data.totalSeconds,
            startTime: data.startTime,
          });
          setRemainingSeconds(remaining);
          setIsPaused(data.isPaused || false);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Erro ao restaurar timer:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persistir timer no localStorage (apenas se NÃO tiver callback)
  useEffect(() => {
    if (activeTimer && !activeTimer.onComplete) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activityName: activeTimer.activityName,
          totalSeconds: activeTimer.totalSeconds,
          startTime: activeTimer.startTime,
          isPaused,
          hasCallback: !!activeTimer.onComplete,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeTimer, isPaused]);

  // Lógica de contagem regressiva
  useEffect(() => {
    if (!activeTimer || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }

        // Aviso aos 30 segundos
        if (prev === 30 && !hasWarned && activeTimer.onComplete) {
          showWarningNotification();
          setHasWarned(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTimer, isPaused, hasWarned]);

  function showWarningNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('⚠️ Timer terminando', {
        body: `${activeTimer?.activityName} - Restam 30 segundos!`,
        icon: '/android-chrome-512x512.png',
        badge: '/android-chrome-512x512.png',
        tag: 'timer-warning',
        silent: false,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    }
  }

  function handleTimerComplete() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mostrar notificação de conclusão
    if ('Notification' in window && Notification.permission === 'granted') {
      notificationRef.current = new Notification('✨ Timer Concluído!', {
        body: `${activeTimer?.activityName} - ${formatTime(activeTimer?.totalSeconds || 0)} completado!`,
        icon: '/android-chrome-512x512.png',
        badge: '/android-chrome-512x512.png',
        tag: 'timer-complete',
        requireInteraction: true,
        silent: false,
      });
      notificationRef.current.onclick = () => {
        window.focus();
        notificationRef.current?.close();
      };
      setTimeout(() => notificationRef.current?.close(), 15000);
    }

    // Chamar callback de conclusão (apenas se existir)
    if (activeTimer?.onComplete) {
      activeTimer.onComplete(activeTimer.totalSeconds);
    }

    // Limpar estado
    setActiveTimer(null);
    setRemainingSeconds(0);
    setIsPaused(false);
    setHasWarned(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  function startTimer(activityName, hours, minutes, seconds, onComplete) {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) return;

    // Fechar notificação anterior
    if (notificationRef.current) {
      notificationRef.current.close();
    }

    const newTimer = {
      activityName,
      totalSeconds,
      onComplete, // guarda callback (não será persistido)
      startTime: Date.now(),
    };

    setActiveTimer(newTimer);
    setRemainingSeconds(totalSeconds);
    setIsPaused(false);
    setHasWarned(false);
    // Não salva no localStorage porque tem callback
    localStorage.removeItem(STORAGE_KEY);
  }

  function pauseTimer() {
    setIsPaused(true);
  }

  function resumeTimer() {
    setIsPaused(false);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
    }
    setActiveTimer(null);
    setRemainingSeconds(0);
    setIsPaused(false);
    setHasWarned(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  function getProgress() {
    if (!activeTimer) return 0;
    const elapsed = activeTimer.totalSeconds - remainingSeconds;
    return (elapsed / activeTimer.totalSeconds) * 100;
  }

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        isPaused,
        remainingSeconds,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        formatTime,
        getProgress,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}
