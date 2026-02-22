
import React, { useState, useRef } from 'react';
import { generateRentalContract } from '../services/geminiService';
import { ContractData } from '../types';

const ContractGenerator: React.FC = () => {
  const initialData: ContractData = {
    landlordName: '',
    landlordNationality: 'Brasileiro(a)',
    landlordMaritalStatus: 'Solteiro(a)',
    landlordProfession: '',
    landlordRg: '',
    landlordCpf: '',
    landlordAddress: '',
    
    tenantName: '',
    tenantNationality: 'Brasileiro(a)',
    tenantMaritalStatus: 'Solteiro(a)',
    tenantProfession: '',
    tenantRg: '',
    tenantCpf: '',
    
    propertyAddress: '',
    propertyType: 'Residencial',
    rentAmount: '',
    paymentDay: '05',
    guaranteeType: 'Caução',
    guaranteeValue: '',
    durationMonths: '12',
    startDate: '',
    iptuResponsibility: 'Locatário',
    customClauses: ''
  };

  const [formData, setFormData] = useState<ContractData>(initialData);
  const [contract, setContract] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const editableRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setFormData(initialData);
    setContract(null);
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await generateRentalContract(formData);
      // Remove apenas introduções típicas da IA se existirem, mas preserva a formatação **
      const cleanResult = result
        .replace(/^Claro, aqui está.*$/mi, '')
        .replace(/^Aqui está o contrato.*$/mi, '')
        .trim();
      setContract(cleanResult);
    } catch (err) {
      alert("Erro ao gerar contrato. Verifique os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addPredefinedClause = (text: string) => {
    setFormData(prev => ({
      ...prev,
      customClauses: prev.customClauses 
        ? `${prev.customClauses}\n\n${text}`
        : text
    }));
  };

  const predefinedClauses = [
    { title: "🚫 Sem Animais", text: "Fica expressamente proibida a permanência de animais de qualquer porte ou espécie no imóvel locado." },
    { title: "🐾 Pets Permitidos", text: "Fica autorizada a permanência de animais domésticos de pequeno porte, desde que respeitadas as normas de higiene e silêncio." },
    { title: "🏢 Sublocação", text: "É vedada a sublocação, cessão ou empréstimo do imóvel sem o consentimento prévio e por escrito do Locador." },
    { title: "🎨 Pintura Nova", text: "O Locatário compromete-se a entregar o imóvel devidamente pintado com as mesmas cores e qualidade recebidas." },
  ];

  const steps = [
    { id: 1, label: 'Básico' },
    { id: 2, label: 'Locador' },
    { id: 3, label: 'Locatário' },
    { id: 4, label: 'Imóvel' },
    { id: 5, label: 'Pagamento' },
    { id: 6, label: 'Garantia' },
    { id: 7, label: 'Cláusulas' }
  ];

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const renderLineWithBold = (line: string) => {
    if (!line.includes('**')) return line;
    const parts = line.split('**');
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part);
  };

  const exportToWord = () => {
    if (!contract) return;
    
    const formattedBody = contract.split('\n').filter(p => p.trim()).map(p => {
      // Converte Markdown ** para HTML <b> para o Word
      const htmlLine = p.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      return `<p style="text-align: justify; font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 12pt;">${htmlLine}</p>`;
    }).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page { size: 21cm 29.7cm; margin: 2.5cm 2.5cm 2.5cm 2.5cm; }
          body { font-family: 'Arial', sans-serif; }
          b { font-weight: bold; }
        </style>
      </head>
      <body>
        ${formattedBody}
        <br><br>
        <table width="100%" style="border-collapse: collapse; margin-top: 50px;">
          <tr>
            <td width="45%" align="center" style="vertical-align: top;">
              <div style="border-top: 1px solid black; width: 80%; margin-bottom: 5px;"></div>
              <p style="font-size: 10pt; font-weight: bold; margin: 0;">${formData.landlordName || 'LOCADOR'}</p>
              <p style="font-size: 8pt; color: #666; margin: 0;">Locador</p>
            </td>
            <td width="10%"></td>
            <td width="45%" align="center" style="vertical-align: top;">
              <div style="border-top: 1px solid black; width: 80%; margin-bottom: 5px;"></div>
              <p style="font-size: 10pt; font-weight: bold; margin: 0;">${formData.tenantName || 'LOCATÁRIO'}</p>
              <p style="font-size: 8pt; color: #666; margin: 0;">Locatário</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato-${formData.tenantName || 'locacao'}.doc`;
    link.click();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Imóvel</label>
              <select name="propertyType" value={formData.propertyType} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm">
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duração (Meses)</label>
                <input type="number" name="durationMonths" value={formData.durationMonths} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Início</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-fade-in space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nome Completo do Locador" name="landlordName" value={formData.landlordName} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nacionalidade" name="landlordNationality" value={formData.landlordNationality} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
                <select name="landlordMaritalStatus" value={formData.landlordMaritalStatus} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm">
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Profissão" name="landlordProfession" value={formData.landlordProfession} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <input placeholder="RG" name="landlordRg" value={formData.landlordRg} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <input placeholder="CPF" name="landlordCpf" value={formData.landlordCpf} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            </div>
            <input placeholder="Endereço Completo de Residência" name="landlordAddress" value={formData.landlordAddress} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-xs" />
          </div>
        );
      case 3:
        return (
          <div className="animate-fade-in space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nome Completo do Locatário" name="tenantName" value={formData.tenantName} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nacionalidade" name="tenantNationality" value={formData.tenantNationality} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
                <select name="tenantMaritalStatus" value={formData.tenantMaritalStatus} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm">
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Profissão" name="tenantProfession" value={formData.tenantProfession} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <input placeholder="RG" name="tenantRg" value={formData.tenantRg} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
              <input placeholder="CPF" name="tenantCpf" value={formData.tenantCpf} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Endereço do Imóvel a ser Locado" name="propertyAddress" value={formData.propertyAddress} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsabilidade IPTU</label>
              <select name="iptuResponsibility" value={formData.iptuResponsibility} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm">
                <option value="Locatário">Locatário</option>
                <option value="Locador">Locador</option>
              </select>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor do Aluguel (R$)</label>
              <input placeholder="Ex: 1.200,00" name="rentAmount" value={formData.rentAmount} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dia de Vencimento</label>
              <input type="number" min="1" max="31" name="paymentDay" value={formData.paymentDay} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Garantia</label>
              <select name="guaranteeType" value={formData.guaranteeType} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm">
                <option value="Caução">Caução</option>
                <option value="Fiador">Fiador</option>
                <option value="Seguro Fiança">Seguro Fiança</option>
                <option value="Sem Garantia">Sem Garantia</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor/Detalhes da Garantia</label>
              <input placeholder="Ex: 3 meses de aluguel" name="guaranteeValue" value={formData.guaranteeValue} onChange={handleInputChange} className="w-full border border-slate-100 bg-white rounded-xl px-4 py-3 font-bold text-sm" />
            </div>
          </div>
        );
      case 7:
        return (
          <div className="animate-fade-in space-y-4">
            <div className="flex flex-wrap gap-2">
              {predefinedClauses.map((clause, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addPredefinedClause(clause.text)}
                  className="bg-slate-100 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-sm"
                >
                  {clause.title}
                </button>
              ))}
            </div>
            <textarea 
              placeholder="Clique nas tags acima ou digite cláusulas extras aqui..." 
              name="customClauses" 
              value={formData.customClauses}
              onChange={handleInputChange}
              rows={3} 
              className="w-full border border-slate-100 bg-white rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
            />
            <button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
              {isLoading ? "Gerando Contrato..." : "Gerar Contrato Agora"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-fade-in pb-20">
      
      <div className="no-print space-y-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Novo Contrato</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Preencha os passos para gerar o documento</p>
            </div>
            <button onClick={resetForm} className="bg-slate-50 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="flex flex-row overflow-x-auto gap-2 mb-6 pb-2 scrollbar-thin scrollbar-thumb-slate-200">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap border ${currentStep === step.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center border ${currentStep === step.id ? 'border-white/30 bg-white/10' : 'border-slate-100 bg-slate-50'}`}>
                  {step.id}
                </span>
                {step.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[160px] flex flex-col justify-center">
            {renderStepContent()}
            
            <div className="flex justify-between mt-6 gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
                className={`px-8 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${currentStep === 7 ? 'opacity-0 pointer-events-none' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between no-print sticky top-20 z-20 bg-slate-50/80 backdrop-blur-sm py-2 px-1">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Visualização do Contrato</h2>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Documento estruturado juridicamente</p>
          </div>
          {contract && (
            <div className="flex gap-3">
              <button onClick={exportToWord} className="bg-white text-slate-700 px-6 py-4 rounded-2xl font-black shadow-sm hover:bg-slate-100 flex items-center gap-3 uppercase tracking-widest text-[10px] transition-all border border-slate-200">
                Word (.doc)
              </button>
              <button onClick={handlePrint} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 flex items-center gap-3 uppercase tracking-widest text-[10px] transition-all hover:-translate-y-1">
                Imprimir / PDF
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-white p-12 md:p-20 rounded-[3rem] shadow-sm border border-slate-200 min-h-[1000px] print:shadow-none print:border-0 print:p-0">
          {contract ? (
            <div ref={editableRef} contentEditable className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-slate-800 outline-none text-justify" suppressContentEditableWarning={true}>
              {contract.split('\n').map((line, i) => (
                <p key={i} className="mb-4">{renderLineWithBold(line)}</p>
              ))}
              <div className="mt-24 space-y-24">
                <div className="grid grid-cols-2 gap-x-16 gap-y-24">
                  <div className="text-center"><div className="w-full border-t border-slate-900 mb-4"></div><p className="text-[11px] font-black uppercase">{formData.landlordName || 'LOCADOR'}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Locador</p></div>
                  <div className="text-center"><div className="w-full border-t border-slate-900 mb-4"></div><p className="text-[11px] font-black uppercase">{formData.tenantName || 'LOCATÁRIO'}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Locatário</p></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-6 mt-60 opacity-30">
               <div className="bg-slate-50 p-10 rounded-full">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
               </div>
               <p className="text-lg font-black uppercase tracking-[0.3em]">Aguardando Dados do Formulário</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractGenerator;
