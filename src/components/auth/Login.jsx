import { useState, useEffect } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [typing, setTyping] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTyping = () => {
    setTyping(true);
    setTimeout(() => setTyping(false), 100);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setError('Preencha todos os campos');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      console.error(err);
      setShake(true);
      setTimeout(() => setShake(false), 600);

      if (err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-[1500ms]"
        style={{
          opacity: typing ? 0.12 : 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='1200' height='800' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M500 100 L520 100 L520 80 L530 80 L530 60 L540 60 L540 40 L560 40 L560 60 L570 60 L570 80 L580 80 L580 100 L600 100 L600 400 L650 400 L650 100 L670 100 L670 80 L680 80 L680 60 L690 60 L690 40 L710 40 L710 60 L720 60 L720 80 L730 80 L730 100 L750 100 L750 400 L800 400 L800 800 L400 800 L400 400 L450 400 L450 100 Z' fill='%23111111'/%3E%3C/svg%3E")`,
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
        }}
      />

      <div
        className={`relative w-full max-w-[420px] bg-[#252525] rounded-3xl p-12 transition-all duration-600 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        } ${shake ? 'animate-shake' : ''}`}
        style={{
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.03' /%3E%3C/svg%3E\")",
          border: shake ? '1.5px solid #8B0000' : '1.5px solid rgba(68, 68, 68, 0.3)',
        }}
      >
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 mb-6 relative transition-all duration-400 ${
              mounted ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{
              transitionDelay: mounted ? '200ms' : '0ms',
              filter: typing
                ? 'brightness(1.15) drop-shadow(0 0 20px rgba(255, 184, 77, 0.6))'
                : 'brightness(1) drop-shadow(0 0 12px rgba(255, 184, 77, 0.4))',
            }}
          >
            <div className="animate-flame-flicker text-6xl">🔥</div>
            <div className="absolute inset-0 pointer-events-none">
              <div className="animate-ember-1 absolute w-1 h-1 bg-[#FFB84D] rounded-full left-1/2 top-1/2" />
              <div className="animate-ember-2 absolute w-1 h-1 bg-[#FF8A00] rounded-full left-1/2 top-1/2" />
              <div className="animate-ember-3 absolute w-1 h-1 bg-[#FFB84D] rounded-full left-1/2 top-1/2" />
            </div>
          </div>

          <h1
            className={`text-4xl font-bold mb-3 transition-all duration-500 ${
              mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.5px',
              color: '#FFB84D',
              textShadow: '0 2px 8px rgba(255, 184, 77, 0.3)',
              transitionDelay: mounted ? '400ms' : '0ms',
            }}
          >
            Grind Tracker
          </h1>

          <div className="flex items-center justify-center mt-6 mb-8 gap-2">
            <div className="w-10 h-[1px] bg-[#444444]" />
            <div className="relative w-3 h-4 cursor-pointer transition-all duration-300 hover:brightness-110 group">
              <div className="absolute w-[1px] h-4 bg-[#444444] left-1/2 -translate-x-1/2 group-hover:animate-pulse-gentle" />
              <div className="absolute w-3 h-[1px] bg-[#444444] top-1 group-hover:animate-pulse-gentle" />
            </div>
            <div className="w-10 h-[1px] bg-[#444444]" />
          </div>
        </div>

        <div className="space-y-5">
          <div
            className={`transition-all duration-500 ${
              mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}
            style={{ transitionDelay: mounted ? '800ms' : '0ms' }}
          >
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-[#E0E0E0] mb-2 tracking-wide"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="exemplo@grindtracker.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-4 py-3 bg-[#333333] border-[1.5px] border-[#444444] rounded-xl text-white text-base transition-all duration-300 focus:outline-none focus:border-[#FFB84D] focus:shadow-[0_0_12px_rgba(255,184,77,0.4)] disabled:opacity-50"
              disabled={loading}
            />
          </div>

          <div
            className={`transition-all duration-500 ${
              mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}
            style={{ transitionDelay: mounted ? '950ms' : '0ms' }}
          >
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-[#E0E0E0] mb-2 tracking-wide"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-3 bg-[#333333] border-[1.5px] border-[#444444] rounded-xl text-white text-base transition-all duration-300 focus:outline-none focus:border-[#FFB84D] focus:shadow-[0_0_12px_rgba(255,184,77,0.4)] disabled:opacity-50"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#8B0000]/10 border border-[#8B0000] text-[#FF6B6B] px-4 py-3 rounded-xl text-sm animate-fadeIn">
              {error}
            </div>
          )}

          <div
            className={`transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: mounted ? '1100ms' : '0ms' }}
          >
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="relative w-full py-4 rounded-xl text-white text-lg font-semibold flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden group cursor-pointer"
              style={{
                fontFamily: 'Georgia, serif',
                background: 'linear-gradient(135deg, #FFB84D 0%, #FF8A00 100%)',
                boxShadow: '0 4px 20px rgba(255, 184, 77, 0.3)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Entrar
                  </>
                )}
              </div>
              {mounted && (
                <div className="absolute bottom-0 left-0 h-[2px] bg-[#FFB84D] animate-border-expand" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#333333] text-center">
          <p className="text-[11px] text-[#666666] italic flex items-center justify-center gap-2 group">
            <span>💪 Rumo à disciplina e consistência</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes flame-flicker {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ember-1 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-10px, -40px); opacity: 0; }
        }
        @keyframes ember-2 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(5px, -45px); opacity: 0; }
        }
        @keyframes ember-3 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(10px, -35px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes border-expand {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-flame-flicker { animation: flame-flicker 4s ease-in-out infinite; }
        .animate-ember-1 { animation: ember-1 1.2s ease-out infinite; }
        .animate-ember-2 { animation: ember-2 1.4s ease-out infinite 0.3s; }
        .animate-ember-3 { animation: ember-3 1.3s ease-out infinite 0.6s; }
        .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-border-expand { animation: border-expand 0.5s ease-out forwards; }
        .animate-pulse-gentle { animation: pulse-gentle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
