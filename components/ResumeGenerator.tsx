
import React, { useState, useRef, useEffect } from 'react';
import { generateProfessionalResume, suggestResumeSummaries, suggestSkillPhrases } from '../services/geminiService';
import { ResumeData } from '../types';

type SuggestionTone = 'Executivo' | 'Criativo' | 'Técnico';

const ResumeGenerator: React.FC = () => {
  const [formData, setFormData] = useState<ResumeData>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: '',
    education: '',
    skills: ''
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState<SuggestionTone>('Executivo');
  const [resumeScore, setResumeScore] = useState(0);
  
  const resumeContainerRef = useRef<HTMLDivElement>(null);

  // Calcula a força do currículo baseado no preenchimento
  useEffect(() => {
    let score = 0;
    if (formData.fullName.length > 5) score += 15;
    if (formData.email.includes('@')) score += 10;
    if (formData.phone.length > 8) score += 10;
    if (formData.location.length > 5) score += 5;
    if (formData.summary.length > 50) score += 20;
    if (formData.experience.length > 100) score += 20;
    if (formData.skills.length > 20) score += 10;
    if (photo) score += 10;
    setResumeScore(score);
  }, [formData, photo]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await generateProfessionalResume({ 
        ...formData, 
        photoBase64: photo?.split(',')[1] 
      });
      setResume(result);
    } catch (err) {
      alert("Erro ao gerar currículo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchSuggestions = async (type: 'summary' | 'skills') => {
    const baseText = type === 'summary' 
      ? (formData.summary || formData.experience || formData.fullName) 
      : (formData.skills || formData.experience || formData.fullName);
    
    if (!baseText || baseText.length < 3) {
      alert("Por favor, preencha o nome ou alguma experiência para que a IA possa analisar seu perfil.");
      return;
    }

    setIsSuggesting(type);
    setSuggestions([]);
    try {
      const results = type === 'summary' 
        ? await suggestResumeSummaries(baseText, selectedTone)
        : await suggestSkillPhrases(baseText, selectedTone);
      setSuggestions(results);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao buscar sugestões. Tente novamente.");
      setIsSuggesting(null);
    }
  };

  const applySuggestion = (text: string, append: boolean = false) => {
    if (isSuggesting) {
      const field = isSuggesting as keyof ResumeData;
      const currentVal = formData[field] as string;
      const newVal = append ? (currentVal ? `${currentVal}\n\n${text}` : text) : text;
      
      setFormData(prev => ({ ...prev, [field]: newVal }));
      setIsSuggesting(null);
      setSuggestions([]);
    }
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const exportToWord = () => {
    if (!resume) return;
    
    const formattedBody = resume.split('\n').map(line => {
      if (line.startsWith('#')) {
        return `<h3 style="font-family: 'Arial', sans-serif; color: #4f46e5; border-left: 5pt solid #4f46e5; padding-left: 10pt; text-transform: uppercase; font-size: 12pt; margin-top: 20pt; margin-bottom: 10pt; font-weight: bold;">${line.replace(/^#+\s*/, '')}</h3>`;
      }
      if (line.trim() === '') return '<br>';
      return `<p style="text-align: justify; font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; margin-bottom: 8pt;">${line.trim()}</p>`;
    }).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>@page { size: 21cm 29.7cm; margin: 2.0cm; } body { font-family: Arial, sans-serif; }</style>
      </head>
      <body>
        <h1 style="text-transform: uppercase;">${formData.fullName}</h1>
        <p>${formData.location} | ${formData.phone} | ${formData.email}</p>
        <hr style="border: 0; border-top: 2pt solid #4f46e5; margin: 15pt 0;">
        ${formattedBody}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `curriculo-${formData.fullName.toLowerCase().replace(/\s+/g, '-')}.doc`;
    link.click();
  };

  return (
    <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in pb-20">
      {/* PAINEL DE EDIÇÃO */}
      <div className="lg:col-span-5 space-y-8 no-print">
        {/* IA Dashboard Header */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <span className="text-indigo-500">✨</span> IA Otimizadora
              </h3>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Força do Currículo</span>
                <span className={`text-xl font-black ${resumeScore > 70 ? 'text-emerald-400' : resumeScore > 40 ? 'text-amber-400' : 'text-rose-400'}`}>{resumeScore}%</span>
              </div>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${resumeScore > 70 ? 'bg-emerald-500' : resumeScore > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${resumeScore}%` }}></div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex bg-white/5 p-1 rounded-xl">
                {(['Executivo', 'Criativo', 'Técnico'] as SuggestionTone[]).map(tone => (
                  <button 
                    key={tone} 
                    onClick={() => setSelectedTone(tone)}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedTone === tone ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 border-b border-slate-100 pb-8">
            <div className="relative group">
              <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl flex items-center justify-center transition-all group-hover:scale-105">
                {photo ? <img src={photo} className="w-full h-full object-cover" alt="Perfil" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-2xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-all border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto de Identificação</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Nome Completo" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <input required placeholder="E-mail" name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Telefone" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <input required placeholder="Cidade/Estado" name="location" value={formData.location} onChange={handleInputChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            {/* Campo Resumo com IA */}
            <div className="space-y-2 relative">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Profissional</label>
                <button 
                  type="button" 
                  onClick={() => fetchSuggestions('summary')}
                  disabled={isSuggesting === 'summary'}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSuggesting === 'summary' ? (
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div> Processando</span>
                  ) : (
                    <>✨ IA Sugerir</>
                  )}
                </button>
              </div>
              <textarea name="summary" value={formData.summary} onChange={handleInputChange} placeholder="Diga quem você é e o que busca..." rows={3} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              
              {isSuggesting === 'summary' && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-[2rem] shadow-2xl p-6 space-y-4 animate-fade-in ring-4 ring-indigo-50">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Opções {selectedTone}</p>
                    <button onClick={() => setIsSuggesting(null)} className="text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  {suggestions.map((s, i) => (
                    <div key={i} className="group relative bg-white border border-slate-100 p-4 rounded-2xl hover:border-indigo-400 transition-all hover:shadow-lg">
                      <p className="text-xs font-medium leading-relaxed text-slate-700 mb-3">{s}</p>
                      <div className="flex gap-2">
                        <button onClick={() => applySuggestion(s)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Substituir</button>
                        <button onClick={() => applySuggestion(s, true)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Adicionar</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => fetchSuggestions('summary')} className="w-full py-2 text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">🔄 Tentar Novamente</button>
                </div>
              )}
            </div>

            {/* Campo Habilidades com IA */}
            <div className="space-y-2 relative">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Habilidades e Competências</label>
                <button 
                  type="button" 
                  onClick={() => fetchSuggestions('skills')}
                  disabled={isSuggesting === 'skills'}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSuggesting === 'skills' ? (
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div> Analisando</span>
                  ) : (
                    <>✨ IA Listar</>
                  )}
                </button>
              </div>
              <textarea name="skills" value={formData.skills} onChange={handleInputChange} placeholder="Ex: Liderança, Inglês Fluente, Excel..." rows={2} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              
              {isSuggesting === 'skills' && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-[2rem] shadow-2xl p-6 space-y-4 animate-fade-in ring-4 ring-indigo-50">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Habilidades Estratégicas</p>
                    <button onClick={() => setIsSuggesting(null)} className="text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  {suggestions.map((s, i) => (
                    <div key={i} className="group relative bg-white border border-slate-100 p-4 rounded-2xl hover:border-indigo-400 transition-all hover:shadow-lg">
                      <p className="text-xs font-medium leading-relaxed text-slate-700 mb-3 italic">"{s}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => applySuggestion(s)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Substituir</button>
                        <button onClick={() => applySuggestion(s, true)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Anexar</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => fetchSuggestions('skills')} className="w-full py-2 text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">🔄 Mudar Abordagem</button>
                </div>
              )}
            </div>

            <textarea name="experience" value={formData.experience} onChange={handleInputChange} placeholder="Trajetória Profissional (Cargos, Empresas e Realizações)..." rows={4} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea name="education" value={formData.education} onChange={handleInputChange} placeholder="Formação Acadêmica e Cursos..." rows={2} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-black transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
              {isLoading ? "REFLEXO DA IA EM CURSO..." : "CONSOLIDAR CURRÍCULO PROFISSIONAL"}
            </button>
          </form>
        </div>
      </div>

      {/* ÁREA DE PREVIEW */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between no-print sticky top-20 z-20 bg-slate-50/80 backdrop-blur-sm py-2 px-1">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Currículo Vitae</h2>
            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">Renderização fiel em tempo real</p>
          </div>
          {resume && (
            <div className="flex gap-3">
              <button onClick={exportToWord} className="bg-white text-slate-700 px-6 py-4 rounded-2xl font-black shadow-sm hover:bg-slate-100 flex items-center gap-3 uppercase tracking-widest text-[10px] transition-all border border-slate-200">
                Word (.doc)
              </button>
              <button onClick={handlePrint} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-3 uppercase tracking-widest text-[10px] transition-all hover:-translate-y-1">
                Imprimir / PDF
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-white p-12 md:p-16 rounded-[3rem] shadow-sm border border-slate-200 min-h-[1000px] print:shadow-none print:border-0 print:p-0">
          {resume ? (
            <div ref={resumeContainerRef} className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-slate-800 outline-none" contentEditable suppressContentEditableWarning>
              <div className="flex items-start justify-between mb-12 border-b-2 border-slate-100 pb-8">
                <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{formData.fullName || "NOME DO CANDIDATO"}</h1>
                  <div className="text-[10px] font-bold text-slate-500 space-x-3 uppercase tracking-wider">
                    <span>{formData.location}</span><span>|</span><span>{formData.phone}</span><span>|</span><span>{formData.email}</span>
                  </div>
                </div>
                {photo && (
                  <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shrink-0 no-print shadow-sm">
                    <img src={photo} className="w-full h-full object-cover" alt="Perfil" />
                  </div>
                )}
              </div>
              <div className="prose prose-slate max-w-none text-justify">
                {resume.split('\n').map((line, i) => {
                  if (line.startsWith('#')) return <h3 key={i} className="text-[12px] font-black text-slate-900 mt-8 mb-4 uppercase tracking-[0.2em] border-l-4 border-indigo-600 pl-4">{line.replace(/^#+\s*/, '')}</h3>
                  if (line.trim() === '') return <div key={i} className="h-2"></div>
                  return <p key={i} className="mb-3 text-slate-700">{line}</p>
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 mt-60 opacity-20">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               <p className="text-sm font-black uppercase tracking-[0.4em] text-center">Aguardando geração inteligente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeGenerator;
