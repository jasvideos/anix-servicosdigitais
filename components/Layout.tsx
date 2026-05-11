
import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onBack, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => currentView !== AppView.DASHBOARD && onBack()}
          >
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7m-10 8v2a2 2 0 002 2h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">ANIX <span className="text-indigo-600">COPIADORA</span></h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Serviços Digitais</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botão de Caixa Diário Estilizado como Ícone */}
            <button 
              onClick={() => onNavigate(AppView.FINANCIAL_CONTROL)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-300 ${
                currentView === AppView.FINANCIAL_CONTROL 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
              }`}
              title="Acessar Caixa Diário"
            >
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {/* Indicador de status/alerta opcional */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse opacity-0 group-hover:opacity-100"></div>
              </div>
              <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Caixa</span>
            </button>

            {currentView !== AppView.DASHBOARD && (
              <button 
                onClick={onBack}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 print:p-0 print:max-w-none">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          <div>&copy; {new Date().getFullYear()} ANIX COPIADORA - Todos os direitos reservados.</div>
          <div className="flex gap-6">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacidade</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Termos de Uso</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
