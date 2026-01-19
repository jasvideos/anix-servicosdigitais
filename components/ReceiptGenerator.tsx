
import React, { useState, useEffect } from 'react';
import { numberToWordsIA, polishReceiptDescription } from '../services/geminiService';

const ReceiptGenerator: React.FC = () => {
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [amountWords, setAmountWords] = useState('');
  const [description, setDescription] = useState('');
  const [receiverName, setReceiverName] = useState('ANIX COPIADORA');
  const [receiverDoc, setReceiverDoc] = useState('00.000.000/0001-00');
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);

  // Debounce para gerar o extenso via IA quando o valor mudar
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountWords('');
      return;
    }

    setIsGeneratingWords(true);
    const timer = setTimeout(async () => {
      try {
        const words = await numberToWordsIA(amount);
        setAmountWords(words);
      } finally {
        setIsGeneratingWords(false);
      }
    }, 600); // Reduzido para 600ms para parecer mais instantâneo

    return () => clearTimeout(timer);
  }, [amount]);

  const handlePolishDescription = async () => {
    if (!description) return;
    setIsProcessingIA(true);
    const polished = await polishReceiptDescription(description);
    setDescription(polished);
    setIsProcessingIA(false);
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const exportToWord = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page { size: 21cm 29.7cm; margin: 2.5cm; }
          body { font-family: 'Arial', sans-serif; color: #333; }
          .header { border-bottom: 2pt solid #000; padding-bottom: 10pt; margin-bottom: 20pt; }
          .receipt-title { font-size: 24pt; font-weight: bold; margin: 0; }
          .amount-box { background-color: #f3f4f6; padding: 15pt; border: 1pt solid #000; float: right; width: 150pt; text-align: center; }
          .amount-text { font-size: 18pt; font-weight: bold; }
          .content { font-size: 12pt; line-height: 1.8; margin-top: 50pt; clear: both; }
          .underline { border-bottom: 1pt solid #000; font-weight: bold; text-transform: uppercase; }
          .footer { margin-top: 60pt; text-align: right; }
          .signature-area { margin-top: 50pt; text-align: center; }
          .sig-line { border-top: 1pt solid #000; width: 250pt; margin: 0 auto 5pt auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="amount-box">
            <p style="font-size: 8pt; margin: 0; font-weight: bold; text-transform: uppercase;">Valor Total</p>
            <p class="amount-text">R$ ${amount || '0,00'}</p>
          </div>
          <h1 class="receipt-title">RECIBO</h1>
          <p style="font-size: 9pt; color: #666; text-transform: uppercase; letter-spacing: 2pt;">Comprovante de Pagamento</p>
        </div>

        <div class="content">
          <p>Recebi(emos) de <span class="underline">${payer || '__________________________________'}</span>,</p>
          <p>a quantia de <span class="underline">${amountWords || '____________________________________________________________________'}</span>,</p>
          <p>referente a <span class="underline">${description || '____________________________________________________________________'}</span>.</p>
        </div>

        <div class="footer">
          <p><b>Data:</b> ${date}</p>
        </div>

        <div class="signature-area">
          <div class="sig-line"></div>
          <p style="font-size: 10pt; font-weight: bold; margin: 0;">${receiverName}</p>
          <p style="font-size: 8pt; color: #666; margin: 0;">${receiverDoc}</p>
          <p style="font-size: 8pt; margin-top: 10pt; color: #999;">Assinatura do Emissor</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recibo-${(payer || 'cliente').toLowerCase().replace(/\s+/g, '-')}.doc`;
    link.click();
  };

  return (
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in pb-20">
      {/* Editor do Recibo */}
      <div className="lg:col-span-5 space-y-6 no-print">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Emissão de Recibo</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preencha os dados do pagamento</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quem pagou? (Pagador)</label>
              <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Ex: João da Silva" className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor (R$)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-black text-lg text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none" />
              </div>
            </div>

            <div className="space-y-1 relative">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor por Extenso</label>
                {isGeneratingWords && <span className="text-[8px] font-black text-indigo-500 animate-pulse uppercase">IA Escrevendo...</span>}
              </div>
              <input 
                value={amountWords} 
                onChange={(e) => setAmountWords(e.target.value)} 
                placeholder="Preenchido automaticamente pela IA" 
                className="w-full border border-slate-100 bg-indigo-50/30 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 italic text-slate-600" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Referente a:</label>
                <button 
                  onClick={handlePolishDescription}
                  disabled={isProcessingIA || !description}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 disabled:opacity-50"
                >
                  {isProcessingIA ? "Polindo..." : "✨ IA Polir Texto"}
                </button>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: xerox e encadernação de documentos" rows={3} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Dados do Emissor (Você)</p>
               <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-2 font-bold text-xs" />
               <input value={receiverDoc} onChange={(e) => setReceiverDoc(e.target.value)} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-2 font-bold text-xs" />
            </div>

            <button onClick={handlePrint} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-black transition-all active:scale-95">
              IMPRIMIR RECIBO
            </button>
          </div>
        </div>
      </div>

      {/* Preview do Recibo */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="flex items-center justify-between no-print bg-slate-50/50 p-2 rounded-xl backdrop-blur-sm">
          <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Pré-visualização do Documento</h3>
          <div className="flex gap-2">
            <button onClick={exportToWord} className="bg-white text-slate-700 px-4 py-2 rounded-xl font-black shadow-sm hover:bg-slate-100 flex items-center gap-2 uppercase tracking-widest text-[9px] transition-all border border-slate-200">
              Word (.doc)
            </button>
            <button onClick={handlePrint} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black shadow-sm hover:bg-indigo-50 flex items-center gap-2 uppercase tracking-widest text-[9px] transition-all border border-indigo-100">
              Imprimir
            </button>
          </div>
        </div>

        <div className="bg-white p-16 rounded-[2rem] border border-slate-200 shadow-xl relative min-h-[500px] overflow-hidden">
          {/* Estilo Picote Lateral Visual */}
          <div className="absolute left-0 top-0 bottom-0 w-2 border-r-2 border-dashed border-slate-100 no-print"></div>

          <div className="space-y-12">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
              <div className="space-y-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">RECIBO</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Comprovante de Pagamento</p>
              </div>
              <div className="bg-slate-900 text-white px-8 py-6 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Valor total</p>
                <p className="text-3xl font-black tracking-tighter italic">R$ {amount || '0,00'}</p>
              </div>
            </div>

            <div className="space-y-8 font-serif text-lg leading-relaxed text-slate-800 italic">
              <p>
                Recebi(emos) de <span className="font-sans font-black text-slate-900 not-italic border-b border-slate-200 uppercase">{payer || '__________________________________'}</span>,
              </p>
              <p>
                a quantia de <span className="font-sans font-black text-slate-900 not-italic border-b border-slate-200 uppercase">{amountWords || '____________________________________________________________________'}</span>,
              </p>
              <p>
                referente a <span className="font-sans font-black text-slate-900 not-italic border-b border-slate-200 uppercase">{description || '____________________________________________________________________'}</span>.
              </p>
            </div>

            <div className="pt-12 flex flex-col items-end gap-12">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-600">{date}</p>
              </div>

              <div className="w-full flex justify-between items-end mt-12">
                <div className="text-left space-y-1 max-w-[50%]">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Emissor</p>
                  <p className="font-bold text-slate-800 text-sm">{receiverName}</p>
                  <p className="text-xs text-slate-500">{receiverDoc}</p>
                </div>
                
                <div className="flex flex-col items-center">
                   <div className="w-72 border-b-2 border-slate-900 mb-2"></div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Assinatura</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-8 text-[8px] font-black text-slate-200 uppercase tracking-[0.5em] no-print">
            SISTEMA ANIX COPIADORA - EMISSÃO DIGITAL
          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            .shadow-xl { box-shadow: none !important; border: 1px solid #eee !important; }
            .bg-slate-900 { background: black !important; color: white !important; }
            .text-indigo-600 { color: black !important; }
          }
        `}
      </style>
    </div>
  );
};

export default ReceiptGenerator;
