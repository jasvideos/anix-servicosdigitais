
import React from 'react';
import { AppView } from '../types';

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const allTools = [
    {
      id: AppView.PHOTO_3X4,
      title: 'FOTOS 3X4',
      description: 'Estúdio digital com remoção de fundo por IA.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-indigo-600'
    },
    {
      id: AppView.RESUME,
      title: 'CURRÍCULO VITAE',
      description: 'Gerador profissional com IA.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-slate-900'
    },
    {
      id: AppView.CONTRACT,
      title: 'CONTRATO ALUGUEL',
      description: 'Contratos juridicamente estruturados.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-blue-600'
    },
    {
      id: AppView.RECEIPT_GENERATOR,
      title: 'RECIBOS',
      description: 'Emissão com extenso automático.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'bg-amber-600'
    },
    {
      id: AppView.QR_PLATE,
      title: 'PLACA PIX',
      description: 'Personalizadas para balcão.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M8 12h.01M8 16h.01M16 16h.01" />
        </svg>
      ),
      color: 'bg-cyan-600'
    },
    {
      id: AppView.LABEL_MAKER,
      title: 'ETIQUETAS',
      description: 'Adesivos circulares ou retangulares.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'bg-rose-600'
    },
    {
      id: AppView.SIGN_MAKER,
      title: 'SINALIZAÇÃO',
      description: 'Placas de aviso industrial.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'bg-orange-600'
    },
    {
      id: AppView.SALES_COST,
      title: 'CUSTO VENDA',
      description: 'Markup e precificação estratégica.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-violet-600'
    }
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4 space-y-4 animate-fade-in">
      <div className="text-center">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
          ANIX <span className="text-indigo-600">COPIADORA</span>
        </h2>
        <div className="flex items-center justify-center gap-3 mt-1">
            <div className="h-px w-8 bg-slate-200"></div>
            <p className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-[0.3em] opacity-80">
              Sistemas Inteligentes de Gestão & Documentos
            </p>
            <div className="h-px w-8 bg-slate-200"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
        {allTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            className="group bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 text-left flex flex-col gap-3 min-h-[140px]"
          >
            <div className={`${tool.color} text-white p-3 rounded-2xl shadow-md group-hover:scale-105 transition-all duration-300 w-fit`}>
              {tool.icon}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors leading-tight">
                {tool.title}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-tight line-clamp-2">
                {tool.description}
              </p>
            </div>

            <div className="mt-auto pt-2 flex items-center text-indigo-600 font-black text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
              ABRIR
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Painel Operacional Ativo</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
