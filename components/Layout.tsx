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
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden print:h-auto print:overflow-visible print:bg-white print:block">
      <header className="bg-white border-b border-slate-200 shrink-0 no-print">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => currentView !== AppView.DASHBOARD && onBack()}
          >
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7m-10 8v2a2 2 0 002 2h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase">ANIX <span className="text-indigo-600">COPIADORA</span></h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Estúdio de Serviços</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate(AppView.FINANCIAL_CONTROL)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                currentView === AppView.FINANCIAL_CONTROL 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Caixa</span>
            </button>

            {currentView !== AppView.DASHBOARD && (
              <button 
                onClick={onBack}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Menu
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1800px] mx-auto overflow-hidden flex flex-col print:overflow-visible print:max-w-none print:h-auto print:block">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 shrink-0 no-print px-6">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center text-slate-400 text-[8px] font-bold uppercase tracking-widest">
          <div>&copy; {new Date().getFullYear()} ANIX COPIADORA</div>
          <div className="flex gap-4">
             <span className="text-indigo-600/50">SISTEMA INTELIGENTE DE GESTÃO DE DOCUMENTOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;