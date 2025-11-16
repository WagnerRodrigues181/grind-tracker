import { useState, useEffect, useRef, createContext, useContext } from 'react';

const TimerContext = createContext(null);

const STORAGE_KEY = 'grindtracker_active_timer';

export function TimerProvider({ children }) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const intervalRef = useRef(null);
  const notificationRef = useRef(null);

  // Solicitar permissão de notificação ao montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Restaurar timer do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
        const remaining = data.totalSeconds - elapsed;

        if (remaining > 0) {
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

  // Persistir timer no localStorage
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activityName: activeTimer.activityName,
          totalSeconds: activeTimer.totalSeconds,
          startTime: activeTimer.startTime,
          isPaused,
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
        if (prev === 30 && !hasWarned) {
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
        body: `${activeTimer.activityName} - Restam 30 segundos!`,
        icon: '/android-chrome-512x512.png',
        badge: '/android-chrome-512x512.png',
        tag: 'timer-warning',
        silent: false, // Usa som do sistema
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-fechar após 5 segundos
      setTimeout(() => {
        if (notification) {
          notification.close();
        }
      }, 5000);
    }
  }

  function handleTimerComplete() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mostrar notificação do sistema (COM SOM DO SISTEMA)
    if ('Notification' in window && Notification.permission === 'granted') {
      notificationRef.current = new Notification('✨ Timer Concluído!', {
        body: `${activeTimer.activityName} - ${formatTime(activeTimer.totalSeconds)} completado!`,
        icon: '/android-chrome-512x512.png',
        badge: '/android-chrome-512x512.png',
        tag: 'timer-complete',
        requireInteraction: true,
        silent: false, // IMPORTANTE: false = usa som do sistema Windows
      });

      notificationRef.current.onclick = () => {
        window.focus();
        notificationRef.current.close();
      };

      // Auto-fechar após 15 segundos
      setTimeout(() => {
        if (notificationRef.current) {
          notificationRef.current.close();
        }
      }, 15000);
    }

    // Chamar callback de conclusão
    if (activeTimer.onComplete) {
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

    // Fechar notificação anterior se existir
    if (notificationRef.current) {
      notificationRef.current.close();
    }

    setActiveTimer({
      activityName,
      totalSeconds,
      onComplete,
      startTime: Date.now(),
    });
    setRemainingSeconds(totalSeconds);
    setIsPaused(false);
    setHasWarned(false);
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
    return ((activeTimer.totalSeconds - remainingSeconds) / activeTimer.totalSeconds) * 100;
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
