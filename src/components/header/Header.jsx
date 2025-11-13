import { useState, useEffect, useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateDisplay, getToday } from '../../utils/dateHelpers';

export default function Header({ setShowProfile }) {
  const { currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef(null);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário';
  const userPhoto = currentUser?.photoURL;
  const userEmail = currentUser?.email;

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(139, 139, 139, 0.3);
          }
          50% {
            border-color: rgba(139, 139, 139, 0.6);
          }
        }
        .avatar-hover:hover {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>

      <header
        className={`sticky top-0 z-40 bg-primary-second/95 backdrop-blur-md transition-all duration-300 ${
          isScrolled ? 'py-2 shadow-lg' : 'py-3 shadow-sm'
        }`}
        style={{ borderBottom: '1px solid rgba(139, 139, 139, 0.1)' }}
      >
        <div className="px-6 md:px-8">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            {/* Logo e marca */}
            <div className="flex items-center gap-3">
              <button
                className="group flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary-accent/50 rounded-lg p-1 -m-1 transition-all hover:scale-[1.02]"
                aria-label="Página inicial"
              >
                <img
                  src="/android-chrome-512x512.png"
                  alt="Grind Tracker"
                  className={`object-cover transition-all duration-300 ${
                    isScrolled ? 'w-9 h-9' : 'w-10 h-10'
                  }`}
                />
                <div>
                  <h1
                    className={`font-bold text-primary-accent transition-all duration-300 ${
                      isScrolled ? 'text-lg' : 'text-xl'
                    }`}
                  >
                    Grind Tracker
                  </h1>
                  <p className="text-xs text-primary-accent/50 font-medium leading-none">
                    {formatDateDisplay(getToday())}
                  </p>
                </div>
              </button>
            </div>

            {/* Menu do usuário */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsMenuOpen(!isMenuOpen);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-accent/10 hover:bg-primary-accent/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent/50 active:scale-95 group"
                aria-label={`Menu do usuário ${displayName}`}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-primary-accent/30 avatar-hover group-hover:scale-110 transition-all"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.avatar-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`avatar-fallback w-8 h-8 rounded-full bg-primary-accent flex items-center justify-center text-primary-first font-bold text-sm group-hover:scale-110 transition-transform ${
                    userPhoto ? 'hidden' : ''
                  }`}
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-primary-accent">
                  {displayName}
                </span>
                <svg
                  className={`w-4 h-4 text-primary-accent/70 transition-transform duration-200 ${
                    isMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-primary-second rounded-xl shadow-2xl border border-primary-accent/10 overflow-hidden animate-fadeIn"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-4 py-3 bg-primary-accent/5 border-b border-primary-accent/10">
                    <p className="text-xs text-primary-accent/60 font-medium mb-1">Logado como</p>
                    <p
                      className="text-sm font-bold text-primary-accent truncate"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      {displayName}
                    </p>
                    <p className="text-xs text-primary-accent/50 truncate mt-0.5">{userEmail}</p>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowProfile(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-primary-accent hover:bg-primary-accent/10 transition-colors focus:outline-none focus:bg-primary-accent/10"
                      role="menuitem"
                    >
                      <User className="w-4 h-4 text-primary-accent/70" />
                      <span>Ver Perfil</span>
                    </button>
                  </div>

                  <div className="border-t border-primary-accent/10"></div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:bg-red-500/10"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
