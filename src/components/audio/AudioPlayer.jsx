import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import menuTheme from '../../assets/menu_theme.mp3';

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);

  // Carregar preferências
  useEffect(() => {
    const saved = localStorage.getItem('bgMusic');
    if (saved) {
      const { playing, volume: savedVol } = JSON.parse(saved);
      setIsPlaying(playing);
      setVolume(savedVol);
    }
  }, []);

  // Controlar áudio
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    isPlaying ? audioRef.current.play().catch(() => setIsPlaying(false)) : audioRef.current.pause();
  }, [isPlaying, volume]);

  // Salvar preferências
  useEffect(() => {
    localStorage.setItem('bgMusic', JSON.stringify({ playing: isPlaying, volume }));
  }, [isPlaying, volume]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleVolume = (e) => setVolume(parseFloat(e.target.value));

  return (
    <>
      <audio ref={audioRef} src={menuTheme} loop preload="auto" />

      {/* PLAYER FLUTUANTE */}
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1a1a1a]/95 backdrop-blur-md rounded-full shadow-2xl border border-[#8b8b8b]/30 p-2 transition-all duration-300"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          timeoutRef.current = setTimeout(() => setShowControls(false), 2000);
        }}
      >
        {/* Ícone principal */}
        <button
          onClick={togglePlay}
          className="p-2.5 rounded-full hover:bg-[#8b8b8b]/20 text-[#8b8b8b] transition-all hover:scale-110"
          title={isPlaying ? 'Pausar música de fundo' : 'Tocar música de fundo'}
        >
          {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Controles expandidos */}
        {showControls && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right duration-200">
            <Music className="w-4 h-4 text-[#8b8b8b]/70" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolume}
              className="w-24 h-1 bg-[#8b8b8b]/20 rounded-full appearance-none cursor-pointer slider-audio"
              style={{
                background: `linear-gradient(to right, #8b8b8b ${volume * 100}%, #8b8b8b33 ${volume * 100}%)`,
              }}
            />
            <span className="text-xs text-[#8b8b8b]/70 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-from-right {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-in {
          animation: slide-in-from-right 0.2s ease-out;
        }
        .slider-audio::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #8b8b8b;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-audio::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #8b8b8b;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </>
  );
}
