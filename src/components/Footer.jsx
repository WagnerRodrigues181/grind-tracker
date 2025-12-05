import { useState } from 'react';
import { X, Github, Linkedin, Mail, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const email = 'rodrigueswagner181@gmail.com';

  function copyEmail() {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <footer className="relative mt-16 border-t border-[#8b8b8b]/10">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#1a1a1a]/50 to-transparent pointer-events-none"></div>

        <div className="relative max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Info */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-sm text-[#8b8b8b]/90 font-medium">
                  Feito por <span className="text-[#8b8b8b] font-semibold">Wagner</span>
                </p>
                <p className="text-xs text-[#8b8b8b]/50">Dezembro 2025</p>
              </div>
            </div>

            {/* Center: Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/WagnerRodrigues181"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/30 group"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4 text-[#8b8b8b]/70 group-hover:text-[#8b8b8b] transition-colors" />
              </a>

              <a
                href="https://linkedin.com/in/wagner-rodrigues-monteiro"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/30 group"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-[#8b8b8b]/70 group-hover:text-[#8b8b8b] transition-colors" />
              </a>

              <button
                onClick={copyEmail}
                className="p-2.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/30 group relative"
                aria-label="Email"
              >
                <Mail className="w-4 h-4 text-[#8b8b8b]/70 group-hover:text-[#8b8b8b] transition-colors" />
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-[#8b8b8b] bg-[#252525] px-2 py-1 rounded border border-[#8b8b8b]/20 whitespace-nowrap"
                  >
                    Copiado!
                  </motion.span>
                )}
              </button>
            </div>

            {/* Right: Info Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/30 group"
              aria-label="Informações do app"
            >
              <Info className="w-4 h-4 text-[#8b8b8b]/70 group-hover:text-[#8b8b8b] transition-colors" />
            </button>
          </div>
        </div>
      </footer>

      {/* Modal com animação */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#8b8b8b]/20"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-br from-[#1e1e1e] to-[#252525] border-b border-[#8b8b8b]/20 px-6 py-4 flex items-center justify-between backdrop-blur-sm z-10">
                <h2 className="text-xl font-bold text-[#8b8b8b]">Sobre o App</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-[#8b8b8b]/10 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5 text-[#8b8b8b]" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="px-6 py-6 space-y-6">
                {/* Sobre o App */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#8b8b8b] flex items-center gap-2">
                    <span>📊</span> Grind Tracker
                  </h3>
                  <div className="space-y-2 text-[#8b8b8b]/80 text-sm leading-relaxed">
                    <p>GrindTracker é um app para registrar e acompanhar hábitos com precisão.</p>
                    <p>Criado para organizar nosso tempo e fortalecer a disciplina diária.</p>
                    <p>Cada ação registrada conta, cada esforço tem valor.</p>
                    <p>Memes dão leveza, mas o propósito é real: consistência e crescimento.</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#8b8b8b]/10"></div>

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#8b8b8b] flex items-center gap-2">
                    <span>📬</span> Contato
                  </h3>
                  <div className="space-y-2">
                    {/* GitHub */}
                    <a
                      href="https://github.com/WagnerRodrigues181"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-200 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/20 group"
                    >
                      <Github className="w-5 h-5 text-[#8b8b8b] group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-[#8b8b8b]">GitHub</p>
                        <p className="text-xs text-[#8b8b8b]/60">WagnerRodrigues181</p>
                      </div>
                    </a>

                    {/* LinkedIn */}
                    <a
                      href="https://linkedin.com/in/wagner-rodrigues-monteiro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-200 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/20 group"
                    >
                      <Linkedin className="w-5 h-5 text-[#8b8b8b] group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-[#8b8b8b]">LinkedIn</p>
                        <p className="text-xs text-[#8b8b8b]/60">wagner-rodrigues-monteiro</p>
                      </div>
                    </a>

                    {/* Email */}
                    <button
                      onClick={copyEmail}
                      className="flex items-center gap-3 p-3 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-all duration-200 border border-[#8b8b8b]/10 hover:border-[#8b8b8b]/20 group w-full text-left relative"
                    >
                      <Mail className="w-5 h-5 text-[#8b8b8b] group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-[#8b8b8b]">Email</p>
                        <p className="text-xs text-[#8b8b8b]/60">{copied ? '✓ Copiado!' : email}</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
