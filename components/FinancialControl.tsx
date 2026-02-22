
import React, { useState, useEffect, useRef } from 'react';
import { analyzeFinanceIA } from '../services/geminiService';

interface Entry {
  id: number;
  description: string;
  amount: number;
  type: 'IN' | 'OUT';
  date: string;
}

interface Bill {
  id: number;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID';
}

interface DailyCashRecord {
  id: number;
  date: string;
  dayName: string;
  previsao: number;
  moedas: number;
  dinheiro: number;
  cartao: number;
  despesas: number;
  retiradaDiaria: number;
  caixaInicial: number;
}

type FinancialTab = 'CAIXA' | 'LIVRO' | 'FLUXO' | 'CONTAS';

const FinancialControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinancialTab>('LIVRO');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyCashRecord[]>([]);
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([]);
  const [initialCash, setInitialCash] = useState<number>(0);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  
  // States para Relatórios e Fechamento
  const [reportType, setReportType] = useState<'IN' | 'OUT' | null>(null);
  const [isClosingDay, setIsClosingDay] = useState(false);

  // States para Formulários
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'IN' | 'OUT' | null>(null);
  const [dueDate, setDueDate] = useState('');

  // States para Livro Caixa
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingRecord, setEditingRecord] = useState<DailyCashRecord | null>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    const savedDesc = localStorage.getItem('anix_saved_descriptions');
    if (savedDesc) {
      setSavedDescriptions(JSON.parse(savedDesc));
    } else {
      const defaults = [
        'CEMITERIO', 'IPTU', 'EDP', 'ALUGUEL', 'CESAN', 'SIMPLES', 
        'SEGURO PICPAY', 'GPS SOL', 'SUMICITY', 'CONTADOR', 
        'CARTAO DE CREDITO', 'TUDONET', 'GRAVOPEL',
        'FECHAMENTO DE CAIXA', 'ALMOÇO', 'GASOLINA', 'TINTAS IMPRESSORAS', 
        'MATERIAL DE CONSTRUÇÃO', 'DIVERSOS'
      ];
      setSavedDescriptions(defaults);
      localStorage.setItem('anix_saved_descriptions', JSON.stringify(defaults));
    }

    const savedEntries = localStorage.getItem('anix_cash_entries');
    if (savedEntries) setEntries(JSON.parse(savedEntries));

    const savedBills = localStorage.getItem('anix_bills');
    if (savedBills) setBills(JSON.parse(savedBills));

    const savedDailyRecords = localStorage.getItem('anix_daily_records');
    if (savedDailyRecords) setDailyRecords(JSON.parse(savedDailyRecords));

    const savedInitialCash = localStorage.getItem('anix_initial_cash');
    if (savedInitialCash) setInitialCash(parseFloat(savedInitialCash));

    const savedBackupDate = localStorage.getItem('anix_last_backup');
    if (savedBackupDate) setLastBackup(savedBackupDate);
  }, []);

  // 2. PERSISTÊNCIA
  useEffect(() => {
    localStorage.setItem('anix_cash_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('anix_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('anix_daily_records', JSON.stringify(dailyRecords));
  }, [dailyRecords]);

  useEffect(() => {
    localStorage.setItem('anix_initial_cash', initialCash.toString());
  }, [initialCash]);

  useEffect(() => {
    if (savedDescriptions.length > 0) {
      localStorage.setItem('anix_saved_descriptions', JSON.stringify(savedDescriptions));
    }
  }, [savedDescriptions]);

  // FUNÇÕES DE EXPORTAÇÃO (BANCO DE DADOS)
  const exportDatabase = () => {
    const data = {
      entries,
      bills,
      initialCash,
      descriptions: savedDescriptions,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('pt-BR').replace(/:/g, 'h');
    
    link.href = url;
    link.download = `banco_dados_anix_${dateStr}_${timeStr}.json`;
    link.click();

    const backupTimestamp = `${dateStr} às ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
    setLastBackup(backupTimestamp);
    localStorage.setItem('anix_last_backup', backupTimestamp);
  };

  const exportReportToExcel = (type: 'IN' | 'OUT' | 'FULL_DAY') => {
    let filtered = entries;
    let title = 'FECHAMENTO_CAIXA_ANIX';

    if (type === 'IN') {
      filtered = entries.filter(e => e.type === 'IN');
      title = 'RELATORIO_DE_ENTRADAS_ANIX';
    } else if (type === 'OUT') {
      filtered = entries.filter(e => e.type === 'OUT');
      title = 'RELATORIO_DE_SAIDAS_ANIX';
    }

    let csvContent = "DATA;DESCRICAO;TIPO;VALOR (R$)\n";
    
    if (type === 'FULL_DAY') {
      csvContent = `FECHAMENTO DE DIA - ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      csvContent += `FUNDO INICIAL:; ; ;R$ ${initialCash.toFixed(2).replace('.', ',')}\n\n`;
      csvContent += "DATA;DESCRICAO;TIPO;VALOR (R$)\n";
    }

    filtered.forEach(e => {
      const formattedAmount = e.amount.toFixed(2).replace('.', ',');
      csvContent += `${e.date};${e.description};${e.type === 'IN' ? 'ENTRADA' : 'SAIDA'};${formattedAmount}\n`;
    });

    const totalInVal = entries.filter(e => e.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
    const totalOutVal = entries.filter(e => e.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
    const finalBalance = initialCash + totalInVal - totalOutVal;

    csvContent += `\n;TOTAL ENTRADAS:; ;R$ ${totalInVal.toFixed(2).replace('.', ',')}`;
    csvContent += `\n;TOTAL SAIDAS:; ;R$ ${totalOutVal.toFixed(2).replace('.', ',')}`;
    csvContent += `\n\n;SALDO FINAL EM CAIXA:; ;R$ ${finalBalance.toFixed(2).replace('.', ',')}`;

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const importDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.entries && Array.isArray(json.entries)) {
          setEntries(json.entries);
          setBills(json.bills || []);
          setInitialCash(json.initialCash || 0);
          if (json.descriptions) setSavedDescriptions(json.descriptions);
          alert("Banco de dados sincronizado com sucesso!");
        }
      } catch (err) {
        alert("Erro ao importar arquivo. Certifique-se de que é um backup válido da ANIX.");
      }
    };
    reader.readAsText(file);
  };

  const totalIn = entries.filter(e => e.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = entries.filter(e => e.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = initialCash + totalIn - totalOut;

  const addEntry = () => {
    if (!desc || !amount || !type) return;
    const newEntry: Entry = {
      id: Date.now(),
      description: desc.toUpperCase(),
      amount: parseFloat(amount),
      type: type,
      date: new Date().toLocaleDateString('pt-BR')
    };
    setEntries([newEntry, ...entries]);
    setDesc('');
    setAmount('');
    setType(null);
  };

  const deleteEntry = (id: number) => {
    if (window.confirm("Deseja excluir este registro do caixa?")) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const finalizeDay = () => {
    if (window.confirm("Deseja ZERAR a fita do caixa para iniciar um novo expediente? O saldo final será salvo como sugestão de abertura.")) {
      setInitialCash(balance);
      setEntries([]);
      setIsClosingDay(false);
      alert("Caixa zerado e preparado para o novo dia!");
    }
  };

  const addBill = () => {
    if (!desc || !amount || !dueDate) return;
    const newBill: Bill = {
      id: Date.now(),
      description: desc.toUpperCase(),
      amount: parseFloat(amount),
      dueDate: dueDate,
      status: 'PENDING'
    };
    setBills([newBill, ...bills]);
    setDesc('');
    setAmount('');
    setDueDate('');
  };

  const markAsPaid = (id: number) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;
    setBills(bills.filter(b => b.id !== id));
    const autoEntry: Entry = {
      id: Date.now(),
      description: `PGTO: ${bill.description}`,
      amount: bill.amount,
      type: 'OUT',
      date: new Date().toLocaleDateString('pt-BR')
    };
    setEntries([autoEntry, ...entries]);
  };

  const getBillStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    if (target < today) return 'OVERDUE';
    if (target.getTime() === today.getTime()) return 'TODAY';
    return 'UPCOMING';
  };

  const getAIAdvice = async () => {
    if (entries.length === 0) {
      setAiInsight("Adicione alguns lançamentos para que a IA possa analisar sua saúde financeira.");
      return;
    }
    setIsLoading(true);
    try {
      const insight = await analyzeFinanceIA(balance, entries.slice(0, 15));
      setAiInsight(insight);
    } catch (err) {
      setAiInsight("Houve um erro técnico ao buscar os conselhos da consultoria. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  const overdueCount = bills.filter(b => getBillStatus(b.dueDate) === 'OVERDUE').length;
  const isFormValid = desc.trim() !== '' && amount !== '' && type !== null;

  // FUNÇÕES DO LIVRO CAIXA
  const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

  const getMonthRecords = () => {
    return dailyRecords.filter(r => {
      const [day, mon, yr] = r.date.split('/').map(Number);
      return mon - 1 === selectedMonth && yr === selectedYear;
    }).sort((a, b) => {
      const [dayA] = a.date.split('/').map(Number);
      const [dayB] = b.date.split('/').map(Number);
      return dayA - dayB;
    });
  };

  const generateMonthDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const existingRecords = getMonthRecords();
    const days: DailyCashRecord[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dateStr = `${day.toString().padStart(2, '0')}/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`;
      const dayName = dayNames[dateObj.getDay()];
      
      const existing = existingRecords.find(r => r.date === dateStr);
      if (existing) {
        days.push(existing);
      } else {
        days.push({
          id: 0,
          date: dateStr,
          dayName,
          previsao: 0,
          moedas: 0,
          dinheiro: 0,
          cartao: 0,
          despesas: 0,
          retiradaDiaria: 0,
          caixaInicial: 0
        });
      }
    }
    return days;
  };

  const saveRecord = (record: DailyCashRecord) => {
    if (record.id === 0) {
      const newRecord = { ...record, id: Date.now() };
      setDailyRecords([...dailyRecords, newRecord]);
    } else {
      setDailyRecords(dailyRecords.map(r => r.id === record.id ? record : r));
    }
    setEditingRecord(null);
  };

  // Cálculos do Livro Caixa
  const calcTotalEntradas = (r: DailyCashRecord) => r.moedas + r.dinheiro + r.cartao + r.despesas; // Moedas + Dinheiro + Cartão + Retirada
  const calcTotalVendaDia = (r: DailyCashRecord) => calcTotalEntradas(r);
  const calcVendaDiaLivroCaixa = (r: DailyCashRecord) => calcTotalVendaDia(r) - r.caixaInicial;
  const calcDinheiroCaixa = (r: DailyCashRecord) => r.moedas + r.dinheiro - r.retiradaDiaria;
  const calcCaixaFinal = (r: DailyCashRecord) => calcDinheiroCaixa(r);

  const monthDays = generateMonthDays();
  const monthTotals = {
    previsao: monthDays.reduce((acc, r) => acc + r.previsao, 0),
    venda: monthDays.reduce((acc, r) => acc + calcTotalVendaDia(r), 0),
    retirada: monthDays.reduce((acc, r) => acc + r.despesas, 0),
    liquido: monthDays.reduce((acc, r) => acc + calcVendaDiaLivroCaixa(r), 0)
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24">
      <datalist id="saved-descriptions">
        {savedDescriptions.sort().map((item, idx) => (
          <option key={idx} value={item} />
        ))}
      </datalist>

      {/* Modal de Relatório Detalhado (Entradas/Saídas) */}
      {reportType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReportType(null)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className={`p-8 ${reportType === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'} text-white flex justify-between items-center`}>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Relatório de {reportType === 'IN' ? 'Entradas' : 'Saídas'}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Lista detalhada de movimentações persistidas</p>
              </div>
              <button onClick={() => setReportType(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total da Categoria</span>
                    <span className={`text-xl font-black ${reportType === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      R$ {(reportType === 'IN' ? totalIn : totalOut).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Itens Registrados</span>
                    <span className="text-xl font-black text-slate-900">
                      {entries.filter(e => e.type === reportType).length}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => exportReportToExcel(reportType)}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Salvar em Excel
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto no-scrollbar pr-2 border-t border-slate-100 pt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-4">Data</th>
                      <th className="pb-4">Descrição</th>
                      <th className="pb-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entries.filter(e => e.type === reportType).map(e => (
                      <tr key={e.id} className="text-sm font-bold text-slate-700">
                        <td className="py-3 text-[10px] text-slate-400">{e.date}</td>
                        <td className="py-3 uppercase">{e.description}</td>
                        <td className={`py-3 text-right font-black ${reportType === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>R$ {e.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechamento de Dia */}
      {isClosingDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsClosingDay(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Fechamento do Dia</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <button onClick={() => setIsClosingDay(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abertura de Caixa</span>
                  <span className="font-bold text-slate-600">R$ {initialCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">(+) Total Entradas</span>
                  <span className="font-bold text-emerald-600">R$ {totalIn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest">(-) Total Saídas</span>
                  <span className="font-bold text-rose-600">R$ {totalOut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-xs font-black uppercase text-slate-900 tracking-[0.2em]">Saldo Final Real</span>
                  <span className={`text-3xl font-black italic ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>R$ {balance.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6">
                <button 
                  onClick={() => exportReportToExcel('FULL_DAY')}
                  className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Exportar Excel Completo
                </button>
                <button 
                  onClick={finalizeDay}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Confirmar e Zerar Fita
                </button>
              </div>
              <p className="text-[8px] text-center font-bold text-slate-400 uppercase tracking-widest">Atenção: Ao zerar a fita, os registros de hoje serão removidos da lista atual.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header com Saldo Dinâmico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            Gestão ANIX
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[8px] font-black text-emerald-600 tracking-widest uppercase">Banco Local Ativo</span>
            </div>
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Painel Administrativo - Dados no Navegador</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-8 py-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-end">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saldo Disponível</span>
            <span className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              R$ {balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 p-2 rounded-[2.5rem] border border-slate-200">
        <div className="flex p-1 bg-slate-200/50 rounded-[2rem] w-full md:w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('LIVRO')} className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'LIVRO' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Livro Caixa</button>
          <button onClick={() => setActiveTab('CAIXA')} className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'CAIXA' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Caixa Diário</button>
          <button onClick={() => setActiveTab('CONTAS')} className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === 'CONTAS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Contas a Pagar {overdueCount > 0 && <span className="absolute top-0 right-2 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px]">{overdueCount}</span>}</button>
          <button onClick={() => setActiveTab('FLUXO')} className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'FLUXO' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Fluxo Mensal</button>
        </div>

        <div className="flex gap-2">
          <button onClick={exportDatabase} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar Banco
          </button>
          <label className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all cursor-pointer flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar Banco
            <input type="file" ref={fileInputRef} onChange={importDatabase} className="hidden" accept=".json" />
          </label>
        </div>
      </div>

      {/* ABA LIVRO CAIXA */}
      {activeTab === 'LIVRO' && (
        <div className="animate-fade-in space-y-6">
          {/* Header do Livro Caixa */}
          <div className="bg-[#FFFF00] p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <h2 className="text-3xl font-black text-[#C00000] uppercase tracking-tight">
                LIVRO CAIXA {monthNames[selectedMonth]} {selectedYear}
              </h2>
              <div className="flex gap-2">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border-2 border-[#C00000] rounded-lg px-4 py-2 font-bold text-[#C00000] text-sm"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border-2 border-[#C00000] rounded-lg px-4 py-2 font-bold text-[#C00000] text-sm"
                >
                  {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Resumo do Mês */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#FFFF00] border-2 border-[#C00000] p-3 rounded-lg text-center">
                <span className="text-[10px] font-black text-[#C00000] uppercase block">Previsão</span>
                <span className="text-xl font-black text-[#C00000]">{monthTotals.previsao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="bg-[#FFFF00] border-2 border-[#C00000] p-3 rounded-lg text-center">
                <span className="text-[10px] font-black text-[#C00000] uppercase block">Venda</span>
                <span className="text-xl font-black text-[#C00000]">{monthTotals.venda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="bg-[#C00000] p-3 rounded-lg text-center">
                <span className="text-[10px] font-black text-white uppercase block">Retirada</span>
                <span className="text-xl font-black text-white">{monthTotals.retirada.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="bg-[#92D050] p-3 rounded-lg text-center">
                <span className="text-[10px] font-black text-white uppercase block">Líquido</span>
                <span className="text-xl font-black text-white">{monthTotals.liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Modal de Edição */}
          {editingRecord && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingRecord(null)}></div>
              <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
                <div className="bg-[#FFFF00] p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-[#C00000] uppercase">{editingRecord.date}</h3>
                    <p className="text-sm font-bold text-[#C00000]/70">{editingRecord.dayName}</p>
                  </div>
                  <button onClick={() => setEditingRecord(null)} className="p-2 hover:bg-[#C00000]/10 rounded-full transition-colors text-[#C00000]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">Previsão</label>
                      <input type="number" step="0.01" value={editingRecord.previsao || ''} onChange={(e) => setEditingRecord({...editingRecord, previsao: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">Caixa Inicial</label>
                      <input type="number" step="0.01" value={editingRecord.caixaInicial || ''} onChange={(e) => setEditingRecord({...editingRecord, caixaInicial: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                    </div>
                  </div>

                  {/* Entradas: Moedas, Dinheiro, Cartão */}
                  <div className="bg-emerald-50 p-4 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-emerald-800 uppercase">Entradas do Dia</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-blue-600 uppercase">Moedas</label>
                        <input type="number" step="0.01" value={editingRecord.moedas || ''} onChange={(e) => setEditingRecord({...editingRecord, moedas: parseFloat(e.target.value) || 0})} className="w-full border border-blue-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-blue-600 uppercase">Dinheiro</label>
                        <input type="number" step="0.01" value={editingRecord.dinheiro || ''} onChange={(e) => setEditingRecord({...editingRecord, dinheiro: parseFloat(e.target.value) || 0})} className="w-full border border-blue-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-cyan-600 uppercase">Cartão</label>
                        <input type="number" step="0.01" value={editingRecord.cartao || ''} onChange={(e) => setEditingRecord({...editingRecord, cartao: parseFloat(e.target.value) || 0})} className="w-full border border-cyan-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                      </div>
                    </div>
                  </div>

                  {/* Retirada */}
                  <div className="bg-rose-50 p-4 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-rose-800 uppercase">Retirada</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-rose-600 uppercase">Valor da Retirada</label>
                      <input type="number" step="0.01" value={editingRecord.despesas || ''} onChange={(e) => setEditingRecord({...editingRecord, despesas: parseFloat(e.target.value) || 0})} className="w-full border border-rose-200 rounded-xl px-4 py-3 font-bold text-sm bg-rose-100" placeholder="0,00" />
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-amber-800 uppercase">Retiradas</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-600 uppercase">Retirada Diária em Dinheiro</label>
                      <input type="number" step="0.01" value={editingRecord.retiradaDiaria || ''} onChange={(e) => setEditingRecord({...editingRecord, retiradaDiaria: parseFloat(e.target.value) || 0})} className="w-full border border-amber-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="0,00" />
                    </div>
                  </div>

                  {/* Preview dos Cálculos */}
                  <div className="bg-slate-100 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-black text-slate-600 uppercase mb-3">Cálculos Automáticos</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Total Entradas:</span><span className="font-bold">{calcTotalEntradas(editingRecord).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Total Venda Dia:</span><span className="font-bold">{calcTotalVendaDia(editingRecord).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Venda Livro Caixa:</span><span className="font-bold text-emerald-600">{calcVendaDiaLivroCaixa(editingRecord).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Dinheiro Caixa:</span><span className="font-bold">{calcDinheiroCaixa(editingRecord).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Caixa Final:</span><span className="font-bold text-indigo-600">{calcCaixaFinal(editingRecord).toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100">
                  <button onClick={() => saveRecord(editingRecord)} className="w-full bg-[#C00000] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#900000] transition-all">
                    Salvar Registro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela do Livro Caixa */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FFFF00]">
                    <th rowSpan={2} className="border border-[#C00000] px-2 py-2 text-[#C00000] font-black text-center">DIA</th>
                    <th rowSpan={2} className="border border-[#C00000] px-2 py-2 text-[#C00000] font-black text-center">PREVISÃO</th>
                    <th colSpan={3} className="border border-[#C00000] px-2 py-1 text-[#C00000] font-black text-center bg-emerald-100">ENTRADAS</th>
                    <th rowSpan={2} className="border border-[#C00000] px-2 py-2 text-white font-black text-center bg-rose-600">RETIRADA</th>
                    <th colSpan={5} className="border border-[#C00000] px-2 py-1 text-[#C00000] font-black text-center bg-green-100">RESULTADO</th>
                  </tr>
                  <tr className="bg-[#FFFF00] text-[10px]">
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-blue-100">MOEDAS</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-blue-100">DINHEIRO</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-cyan-100">CARTÃO</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-green-100">TOTAL VENDA</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-green-100">- CX INICIAL</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-green-200">VENDA LIVRO</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-amber-100">RETIRADA</th>
                    <th className="border border-[#C00000] px-1 py-1 text-[#C00000] font-black bg-green-300">CAIXA</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDays.map((record, idx) => {
                    const isDomingo = record.dayName === 'domingo';
                    const totalEntradas = calcTotalEntradas(record);
                    const totalVenda = calcTotalVendaDia(record);
                    const vendaLivro = calcVendaDiaLivroCaixa(record);
                    const dinheiroCx = calcDinheiroCaixa(record);
                    const caixaFinal = calcCaixaFinal(record);

                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setEditingRecord(record)}
                        className={`cursor-pointer hover:bg-yellow-50 transition-colors ${isDomingo ? 'bg-slate-100' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                      >
                        <td className="border border-slate-200 px-2 py-2 font-bold text-slate-700">
                          <div className="text-[11px]">{record.date.split('/')[0]}/fev./{record.dayName}</div>
                        </td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold ${record.previsao > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{record.previsao.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-blue-50/50 ${record.moedas > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{record.moedas.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-blue-50/50 ${record.dinheiro > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{record.dinheiro.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-cyan-50/50 ${record.cartao > 0 ? 'text-cyan-700' : 'text-slate-300'}`}>{record.cartao.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-black bg-rose-100 ${record.despesas > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{record.despesas.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-green-50/50 ${totalVenda !== 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{totalVenda.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-green-50/50 ${record.caixaInicial > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{record.caixaInicial.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-black bg-green-100/50 ${vendaLivro > 0 ? 'text-emerald-600' : vendaLivro < 0 ? 'text-rose-600' : 'text-slate-300'}`}>{vendaLivro.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-bold bg-amber-50/50 ${record.retiradaDiaria > 0 ? 'text-amber-700' : 'text-slate-300'}`}>{record.retiradaDiaria.toFixed(2)}</td>
                        <td className={`border border-slate-200 px-2 py-2 text-center font-black bg-green-200/50 ${caixaFinal > 0 ? 'text-emerald-700' : caixaFinal < 0 ? 'text-rose-600' : 'text-slate-300'}`}>{caixaFinal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Clique em qualquer linha para editar os valores do dia</p>
        </div>
      )}

      {activeTab === 'CAIXA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          <div className="lg:col-span-5 space-y-6">
            {/* ABERTURA DE CAIXA INICIAL */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-80 italic">Abertura de Caixa</h3>
                <div className="bg-white/20 px-2 py-1 rounded text-[8px] font-black uppercase">Fundo Diário</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-black opacity-60 italic">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={initialCash} 
                  onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
                  placeholder="0,00" 
                  className="bg-transparent border-b-2 border-white/30 text-3xl font-black italic outline-none w-full focus:border-white transition-all placeholder:text-white/20"
                />
              </div>
              <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest leading-relaxed">Este valor é o fundo fixo que você inicia o dia no caixa físico.</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Novo Lançamento</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">O que está entrando/saindo?</label>
                  <input list="saved-descriptions" placeholder="Ex: XEROX, EDP, SIMPLES..." value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
                  
                  {/* Atalhos Rápidos */}
                  <div className="flex flex-wrap gap-2 pt-2 max-h-32 overflow-y-auto no-scrollbar">
                    {['CEMITERIO', 'IPTU', 'EDP', 'ALUGUEL', 'CESAN', 'SIMPLES', 'CONTADOR', 'CARTAO DE CREDITO'].map(item => (
                      <button key={item} onClick={() => setDesc(item)} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[8px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 uppercase transition-all">{item}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Valor (R$)</label>
                    <input type="number" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Fluxo</label>
                    <div className="flex gap-2">
                      <button onClick={() => setType('IN')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${type === 'IN' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>Entrada</button>
                      <button onClick={() => setType('OUT')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${type === 'OUT' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>Saída</button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={addEntry}
                  disabled={!isFormValid}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${isFormValid ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                  {type === null ? "Selecione Entrada ou Saída" : "Confirmar Lançamento"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Fita do Caixa (Histórico)</h3>
                <button 
                  onClick={() => setIsClosingDay(true)}
                  disabled={entries.length === 0}
                  className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-30 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Fechar Dia
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="text-[8px] font-black uppercase text-slate-400">Resumo:</div>
                <div className="text-[9px] font-black text-emerald-600 italic">+{totalIn.toFixed(2)}</div>
                <div className="text-[9px] font-black text-rose-600 italic">-{totalOut.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-3 max-h-[650px] overflow-y-auto no-scrollbar pr-1">
              {entries.length === 0 ? (
                <div className="py-20 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-widest">Caixa Vazio</p></div>
              ) : (
                entries.map(e => (
                  <div key={e.id} className="group flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${e.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{e.type === 'IN' ? '+' : '-'}</div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{e.description}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{e.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-sm ${e.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>R$ {e.amount.toFixed(2)}</span>
                      <button onClick={() => deleteEntry(e.id)} className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CONTAS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Agendar Débito</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Título da Conta</label>
                  <input list="saved-descriptions" placeholder="ALUGUEL, CESAN, EDP..." value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500 uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Previsto</label>
                  <input type="number" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data de Vencimento</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <button onClick={addBill} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-rose-700 transition-all active:scale-95">Agendar Conta</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px]">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">Contas Pendentes</h3>
            <div className="space-y-4">
              {bills.length === 0 ? (
                <div className="py-20 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conta pendente</p></div>
              ) : (
                bills.map(b => (
                  <div key={b.id} className="flex flex-col md:flex-row justify-between items-center p-6 bg-slate-50 border border-slate-100 rounded-3xl transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getBillStatus(b.dueDate) === 'OVERDUE' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-200 text-slate-400'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tighter">{b.description}</p>
                        <p className="text-[10px] font-bold text-slate-400">Vence em: {new Date(b.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                      <span className="text-xl font-black text-slate-900">R$ {b.amount.toFixed(2)}</span>
                      <button onClick={() => markAsPaid(b.id)} className="bg-emerald-500 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">Paguei</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'FLUXO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Entradas */}
              <button 
                onClick={() => setReportType('IN')}
                className="group relative bg-emerald-600 p-8 rounded-[2.5rem] text-left text-white shadow-xl shadow-emerald-100 flex flex-col justify-between h-44 border-b-8 border-emerald-700 transition-all active:scale-95"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Entradas</span>
                  <span className="text-[8px] font-black bg-emerald-500 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                </div>
                <h4 className="text-4xl font-black tracking-tighter italic">R$ {totalIn.toFixed(2)}</h4>
              </button>

              {/* Card Saídas */}
              <button 
                onClick={() => setReportType('OUT')}
                className="group relative bg-rose-600 p-8 rounded-[2.5rem] text-left text-white shadow-xl shadow-rose-100 flex flex-col justify-between h-44 border-b-8 border-rose-700 transition-all active:scale-95"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Saídas</span>
                  <span className="text-[8px] font-black bg-rose-500 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                </div>
                <h4 className="text-4xl font-black tracking-tighter italic">R$ {totalOut.toFixed(2)}</h4>
              </button>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Dicas da Consultoria IA</h3>
              <div className="space-y-4">
                <button onClick={getAIAdvice} disabled={isLoading || entries.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">Analisar Minha Saúde Financeira</button>
                {aiInsight && <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic text-sm text-slate-700 leading-relaxed">"{aiInsight}"</div>}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
             
             <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-indigo-400">ANIX Cloud Sync</h3>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Conexão Google Drive</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ativo (Portátil)</span>
                      <div className="flex gap-2">
                        <button onClick={exportDatabase} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all" title="Gerar Backup JSON"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all" title="Sincronizar Arquivo"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Último Backup Externo</p>
                    <p className="text-[10px] font-black text-white">{lastBackup || "Nenhum backup realizado"}</p>
                  </div>
                </div>
             </div>

             <div className="space-y-3 mt-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                   <p className="text-[8px] font-black uppercase text-slate-500">Abertura de Caixa</p>
                   <p className="text-sm font-black text-white">R$ {initialCash.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                   <p className="text-[8px] font-black uppercase text-slate-500">Registros Ativos</p>
                   <p className="text-sm font-black text-white">{entries.length + bills.length} itens</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;
