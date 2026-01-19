
import React, { useState } from 'react';
import { suggestPricingStrategy } from '../services/geminiService';

const SalesCostCalculator: React.FC = () => {
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('Papelaria');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculate = async () => {
    if (!cost) return;
    setIsLoading(true);
    const suggestion = await suggestPricingStrategy(parseFloat(cost), category);
    setResult(suggestion);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Custo de Venda</h2>
        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em]">Otimização de Lucro & Markup</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 h-fit">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Custo do Produto/Insumo (R$)</label>
            <input 
              type="number" 
              value={cost} 
              onChange={(e) => setCost(e.target.value)}
              placeholder="Ex: 5.00" 
              className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-lg focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria de Serviço</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Impressão/Xerox">Impressão/Xerox</option>
              <option value="Papelaria">Papelaria</option>
              <option value="Serviços Digitais">Serviços Digitais</option>
              <option value="Encadernação">Encadernação</option>
              <option value="Personalizados">Personalizados</option>
            </select>
          </div>

          <button 
            onClick={calculate}
            disabled={isLoading || !cost}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {isLoading ? "Calculando Estratégia..." : "Calcular Preço Ideal"}
          </button>
        </div>

        <div className="space-y-6">
          {result ? (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 animate-fade-in relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-2">Preço Sugerido</p>
                  <h3 className="text-5xl font-black tracking-tighter italic">R$ {result.suggestedPrice.toFixed(2)}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Markup</p>
                  <p className="text-2xl font-black">{result.markup}x</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Racional da IA:</h4>
                <p className="text-sm font-medium leading-relaxed text-slate-200">
                  {result.reasoning}
                </p>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Lucro Bruto Est.:</span>
                  <span className="text-emerald-400">R$ {(result.suggestedPrice - parseFloat(cost)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20 py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-black uppercase tracking-[0.4em]">Aguardando dados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesCostCalculator;
