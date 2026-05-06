import { createContext, useContext, useState, useEffect, useRef } from 'react';
import menuTheme from '../assets/menu_theme.mp3';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bgMusic');
      if (saved) {
        const { playing, volume: savedVol } = JSON.parse(saved);
        setIsPlaying(playing);
        setVolume(savedVol);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, volume]);

  useEffect(() => {
    localStorage.setItem('bgMusic', JSON.stringify({ playing: isPlaying, volume }));
  }, [isPlaying, volume]);

  const togglePlay = () => setIsPlaying((p) => !p);

  return (
    <AudioContext.Provider value={{ isPlaying, volume, setVolume, togglePlay }}>
      <audio ref={audioRef} src={menuTheme} loop preload="auto" />
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio deve ser usado dentro de <AudioProvider>');
  return ctx;
};
