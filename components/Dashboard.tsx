
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
      id: AppView.PHOTO_A4,
      title: 'FOTOS A4',
      description: 'Composições múltiplas, Polaroid e tamanhos sob medida.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      color: 'bg-blue-500'
    },
    {
      id: AppView.PRINT_MASTER,
      title: 'IMPRESSÃOMASTER PRO',
      description: 'Estação de elite para pré-impressão e super-resolução.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
        </svg>
      ),
      color: 'bg-emerald-600'
    },
    {
      id: AppView.QR_PLATE,
      title: 'PLACA PIX',
      description: 'Design personalizado para balcão.',
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
      description: 'Placas de aviso e segurança.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'bg-orange-600'
    },
    {
      id: AppView.RESUME,
      title: 'CURRÍCULO VITAE',
      description: 'Gerador profissional assistido por IA.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-slate-900'
    },
    {
      id: AppView.CONTRACT,
      title: 'CONTRATO DE ALUGUEL',
      description: 'Estruturação jurídica personalizada.',
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
      id: AppView.SALES_COST,
      title: 'CUSTO VENDA',
      description: 'Markup e precificação inteligente.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2-2v14a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-violet-600'
    }
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
          ANIX <span className="text-indigo-600">COPIADORA</span>
        </h2>
        <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-slate-200"></div>
            <p className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-[0.4em] opacity-80">
              Serviços Digitais Inteligentes
            </p>
            <div className="h-px w-12 bg-slate-200"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
        {allTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            className="group bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-indigo-400 hover:shadow-2xl transition-all duration-500 text-left flex flex-col gap-5 min-h-[180px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors"></div>
            
            <div className={`${tool.color} text-white p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-500 w-fit relative z-10`}>
              {tool.icon}
            </div>
            
            <div className="space-y-2 relative z-10">
              <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors leading-none">
                {tool.title}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed line-clamp-2">
                {tool.description}
              </p>
            </div>

            <div className="mt-auto pt-4 flex items-center text-indigo-600 font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
              INICIAR SERVIÇO
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Plataforma Operacional Conectada</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
