import { Component } from 'react';

/**
 * ErrorBoundary - Captura erros em qualquer componente filho
 * Previne que a app toda quebre por causa de um erro isolado
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary capturou erro:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl shadow-2xl border-2 border-[#8b8b8b]/30 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-[#8b8b8b] mb-2 font-cinzel">
                Algo deu errado
              </h2>
              <p className="text-sm text-[#8b8b8b]/70">A aplicação encontrou um erro inesperado</p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-[#1a1a1a] rounded-xl border border-red-500/30 max-h-48 overflow-y-auto">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full p-4 bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#1a1a1a] rounded-xl font-semibold transition-all"
              >
                Recarregar Aplicação
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full p-4 bg-[#252525] hover:bg-[#2a2a2a] text-[#8b8b8b] rounded-xl font-semibold border border-[#8b8b8b]/30 transition-all"
              >
                Voltar ao Início
              </button>
            </div>

            <p className="text-xs text-[#8b8b8b]/50 text-center mt-6">
              Se o erro persistir, tente limpar o cache do navegador
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
