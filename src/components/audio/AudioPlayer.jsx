import { useState, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';

export default function AudioPlayer() {
  const { isPlaying, volume, setVolume, togglePlay } = useAudio();
  const [showControls, setShowControls] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowControls(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowControls(false), 2000);
  };

  return (
    <>
      {/*
        hidden -> some no mobile (o botão fica no Header)
        sm:flex -> aparece em desktop como bolha flutuante
      */}
      <div
        className="hidden sm:flex fixed bottom-6 right-6 z-50 items-center gap-2
                   bg-[#1a1a1a]/95 backdrop-blur-md rounded-full shadow-2xl
                   border border-[#8b8b8b]/30 p-2 transition-all duration-300"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={togglePlay}
          className="p-2.5 rounded-full hover:bg-[#8b8b8b]/20 text-[#8b8b8b]
                     transition-all hover:scale-110"
          title={isPlaying ? 'Pausar música de fundo' : 'Tocar música de fundo'}
        >
          {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {showControls && (
          <div className="flex items-center gap-2 audio-slide-in">
            <Music className="w-4 h-4 text-[#8b8b8b]/70" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer slider-audio"
              style={{
                background: `linear-gradient(to right, #8b8b8b ${volume * 100}%,
                             #8b8b8b33 ${volume * 100}%)`,
              }}
            />
            <span className="text-xs text-[#8b8b8b]/70 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes audioSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .audio-slide-in { animation: audioSlideIn 0.2s ease-out; }
        .slider-audio::-webkit-slider-thumb {
          appearance: none; width: 12px; height: 12px;
          background: #8b8b8b; border-radius: 50%; cursor: pointer;
        }
        .slider-audio::-moz-range-thumb {
          width: 12px; height: 12px; background: #8b8b8b;
          border-radius: 50%; cursor: pointer; border: none;
        }
      `}</style>
    </>
  );
}
