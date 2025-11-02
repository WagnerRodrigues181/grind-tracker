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
      <footer className="bg-primary-second border-t border-primary-accent mt-12">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-accent/70">
              Feito por <span className="font-semibold text-primary-accent">Wagner</span> • Novembro
              2025
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 hover:bg-primary-accent/10 rounded-lg transition-colors group"
              aria-label="Informações do app"
            >
              <Info className="w-5 h-5 text-primary-accent/70 group-hover:text-primary-accent transition-colors" />
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-primary-second rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-primary-accent"
            >
              {/* Header */}
              <div className="sticky top-0 bg-primary-second border-b border-primary-accent px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-primary-accent">Sobre o App</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-primary-accent/10 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5 text-primary-accent" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="px-6 py-6 space-y-6">
                {/* Sobre o App */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary-accent">📊 Grind Tracker</h3>
                  <p className="text-primary-accent/80">
                    GrindTracker é um app para registrar e acompanhar hábitos com precisão.
                  </p>
                  <p className="text-primary-accent/80">
                    Criado para organizar nosso tempo e fortalecer a disciplina diária.
                  </p>
                  <p className="text-primary-accent/80">
                    Cada ação registrada conta, cada esforço tem valor.
                  </p>
                  <p className="text-primary-accent/80">
                    Memes dão leveza, mas o propósito é real: consistência e crescimento.
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-primary-accent/20"></div>

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary-accent">📬 Contato</h3>
                  <div className="space-y-3">
                    {/* GitHub */}
                    <a
                      href="https://github.com/WagnerRodrigues181"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-primary-accent/5 hover:bg-primary-accent/10 rounded-lg transition-colors group"
                    >
                      <Github className="w-5 h-5 text-primary-accent group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-primary-accent">GitHub</p>
                        <p className="text-xs text-primary-accent/70">WagnerRodrigues181</p>
                      </div>
                    </a>

                    {/* LinkedIn */}
                    <a
                      href="https://linkedin.com/in/wagner-rodrigues-monteiro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-primary-accent/5 hover:bg-primary-accent/10 rounded-lg transition-colors group"
                    >
                      <Linkedin className="w-5 h-5 text-primary-accent group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-primary-accent">LinkedIn</p>
                        <p className="text-xs text-primary-accent/70">wagner-rodrigues-monteiro</p>
                      </div>
                    </a>

                    {/* Email (copiar) */}
                    <button
                      onClick={copyEmail}
                      className="flex items-center gap-3 p-3 bg-primary-accent/5 hover:bg-primary-accent/10 rounded-lg transition-colors group w-full text-left"
                    >
                      <Mail className="w-5 h-5 text-primary-accent group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-medium text-primary-accent">Email</p>
                        <p className="text-xs text-primary-accent/70">
                          {copied ? 'Copiado!' : email}
                        </p>
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
