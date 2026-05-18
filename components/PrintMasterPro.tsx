
import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useRef, useState } from 'react';
import { removeBackgroundAI } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const PAINT_COLORS = [
  '#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7'
];

const PrintMasterPro: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [paperSize, setPaperSize] = useState({ name: 'A4', w: 210, h: 297 });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dpi, setDpi] = useState(0);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');

  // Estados para PDF
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Ferramentas de Contorno do PREVIEW (Folha)
  const [hasOutline, setHasOutline] = useState(false);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(2);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const PRESETS = [
    { name: 'A4', w: 210, h: 297 },
    { name: 'A3', w: 297, h: 420 },
    { name: 'A2', w: 420, h: 594 },
    { name: 'A1', w: 594, h: 841 }
  ];

  useEffect(() => {
    const isCurrentlyPortrait = paperSize.h >= paperSize.w;
    if (orientation === 'portrait' && !isCurrentlyPortrait) {
      setPaperSize(prev => ({ ...prev, w: Math.min(prev.w, prev.h), h: Math.max(prev.w, prev.h) }));
    } else if (orientation === 'landscape' && isCurrentlyPortrait) {
      setPaperSize(prev => ({ ...prev, w: Math.max(prev.w, prev.h), h: Math.min(prev.w, prev.h) }));
    }
  }, [orientation]);

  useEffect(() => {
    if (dimensions.width && dimensions.height && image) {
      const paperWidthInches = paperSize.w / 25.4;
      const paperHeightInches = paperSize.h / 25.4;
      let occupiedWidthInches = paperWidthInches;
      
      if (fitMode === 'contain') {
        const paperRatio = paperSize.w / paperSize.h;
        const imgRatio = dimensions.width / dimensions.height;
        if (imgRatio > paperRatio) {
          occupiedWidthInches = paperWidthInches;
        } else {
          occupiedWidthInches = paperHeightInches * imgRatio;
        }
      }

      const finalWidthOnPaperInches = occupiedWidthInches * (scale / 100);
      const currentDpi = dimensions.width / finalWidthOnPaperInches;
      setDpi(Math.round(currentDpi));
    }
  }, [dimensions, paperSize, scale, fitMode, image]);

  const renderPdfPage = async (pdf: any, pageNumber: number) => {
    setIsProcessing(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.5 }); // Escala alta para preservar qualidade na impressão
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
        const imgData = canvas.toDataURL('image/png');
        setImage(imgData);
        setDimensions({ width: canvas.width, height: canvas.height });
        setScale(100);
        setPosition({ x: 50, y: 50 });
      }
    } catch (err) {
      console.error("Erro ao renderizar página do PDF:", err);
      alert("Erro ao ler página do PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const loadingTask = pdfjsLib.getDocument({ data: event.target?.result as ArrayBuffer });
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            await renderPdfPage(pdf, 1);
          } catch (err) {
            alert("Erro ao carregar PDF.");
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            setDimensions({ width: img.width, height: img.height });
            setImage(event.target?.result as string);
            setScale(100);
            setPosition({ x: 50, y: 50 });
            setPdfDoc(null); // Limpa PDF se carregar imagem
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handlePageChange = async (newStep: number) => {
    const next = currentPage + newStep;
    if (next >= 1 && next <= totalPages && pdfDoc) {
      setCurrentPage(next);
      await renderPdfPage(pdfDoc, next);
    }
  };

  const upscaleImage = async () => {
    if (!image) return;
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) { await (window as any).aistudio.openSelectKey(); }

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: 'Perform a high quality 2x upscale.' }
          ]
        },
        config: { imageConfig: { imageSize: "2K" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const upscaled = `data:image/png;base64,${part.inlineData.data}`;
            setImage(upscaled);
            const img = new Image();
            img.onload = () => setDimensions({ width: img.width, height: img.height });
            img.src = upscaled;
          }
        }
      }
    } catch (err) { alert("Erro no upscale."); } finally { setIsProcessing(false); }
  };

  const removeBg = async () => {
    if (!image) return;
    setIsProcessing(true);
    const result = await removeBackgroundAI(image.split(',')[1]);
    if (result) {
      setImage(result);
      const img = new Image();
      img.onload = () => setDimensions({ width: img.width, height: img.height });
      img.src = result;
    }
    setIsProcessing(false);
  };

  const handlePrint = () => { 
    window.print(); 
  };

  const getDpiColor = () => dpi >= 300 ? 'text-emerald-500' : dpi >= 150 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-[85vh]">
      <style>{`
        @media print {
          .print-canvas-area { 
            display: block !important;
            visibility: visible !important;
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: ${paperSize.w}mm !important; 
            height: ${paperSize.h}mm !important; 
            background: white !important; 
            overflow: hidden !important; 
            border: ${hasOutline ? `${outlineWidth}px solid ${outlineColor}` : 'none'} !important;
            box-sizing: border-box !important;
            filter: ${colorMode === 'grayscale' ? 'grayscale(100%)' : 'none'} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-img-wrap { 
            position: absolute !important; 
            left: ${position.x}% !important; 
            top: ${position.y}% !important; 
            width: 100% !important; 
            height: 100% !important; 
            display: flex !important; 
            align-items: center !important; 
            justify-content: center !important; 
            transform: translate(-50%, -50%) !important; 
          }
          .print-img { 
            transform: scale(${scale/100}) !important; 
            width: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto')} !important; 
            height: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%')} !important;
          }
          @page { 
            size: ${paperSize.w}mm ${paperSize.h}mm; 
            margin: 0; 
          }
        }
        .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.3); }
        .checkerboard { background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px; }
      `}</style>

      <div className="lg:col-span-4 flex flex-col gap-6 no-print h-full overflow-hidden">
        <div className="glass-panel p-6 rounded-[2.5rem] shadow-xl space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">PrintMaster <span className="text-indigo-600">Pro</span></h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração Profissional</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Modo de Cor</label>
            <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
              <button onClick={() => setColorMode('color')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${colorMode === 'color' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'bg-transparent text-slate-400'}`}>
                Colorido
              </button>
              <button onClick={() => setColorMode('grayscale')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${colorMode === 'grayscale' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-slate-400'}`}>
                P&B
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all">
              Importar Arte / PDF
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf, .png, .jpg, .jpeg, .gif, .webp, .tiff, .svg, image/*, application/pdf" onChange={handleFileUpload} />
            </button>

            {pdfDoc && (
              <div className="bg-slate-100 p-4 rounded-2xl space-y-2 border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Navegação PDF</p>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => handlePageChange(-1)} disabled={currentPage <= 1} className="p-2 bg-white rounded-lg border border-slate-200 disabled:opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs font-black text-slate-900">{currentPage} / {totalPages}</span>
                  <button onClick={() => handlePageChange(1)} disabled={currentPage >= totalPages} className="p-2 bg-white rounded-lg border border-slate-200 disabled:opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={removeBg} disabled={isProcessing || !image} className="bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 shadow-md">IA Fundo</button>
              <button onClick={upscaleImage} disabled={isProcessing || !image} className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-100 border border-indigo-100">Super Res.</button>
            </div>
          </div>

          <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Contorno do Papel</label>
              <div onClick={() => setHasOutline(!hasOutline)} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${hasOutline ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${hasOutline ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
            {hasOutline && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase text-indigo-400"><span>Espessura</span><span>{outlineWidth}px</span></div>
                  <input type="range" min="1" max="60" value={outlineWidth} onChange={(e) => setOutlineWidth(Number(e.target.value))} className="w-full accent-indigo-600 h-1 bg-indigo-200 rounded-lg" />
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {PAINT_COLORS.map(c => (
                    <button key={c} onClick={() => setOutlineColor(c)} className={`w-full aspect-square rounded-sm border ${outlineColor === c ? 'ring-2 ring-indigo-500 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-100">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Papel e Escala</label>
              <div className="flex gap-2">
                <button onClick={() => setOrientation('portrait')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border ${orientation === 'portrait' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>Retrato</button>
                <button onClick={() => setOrientation('landscape')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border ${orientation === 'landscape' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>Paisagem</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => setPaperSize(orientation === 'portrait' ? { ...p, w: Math.min(p.w, p.h), h: Math.max(p.w, p.h) } : { ...p, w: Math.max(p.w, p.h), h: Math.min(p.w, p.h) })} className={`py-2 rounded-lg text-[10px] font-black uppercase border ${paperSize.name === p.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{p.name}</button>
                ))}
              </div>
            </div>
            <input type="range" min="10" max="500" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-indigo-600" />
            <div className="grid grid-cols-2 gap-4">
              <input type="range" min="0" max="100" value={position.x} onChange={(e) => setPosition(p => ({ ...p, x: Number(e.target.value) }))} className="w-full accent-slate-400" />
              <input type="range" min="0" max="100" value={position.y} onChange={(e) => setPosition(p => ({ ...p, y: Number(e.target.value) }))} className="w-full accent-slate-400" />
            </div>
          </div>

          <button onClick={handlePrint} disabled={!image || isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-30">Imprimir Final</button>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6 no-print h-full overflow-hidden">
        <div className="flex justify-between items-center glass-panel px-8 py-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Qualidade</span>
              <span className={`text-2xl font-black italic ${getDpiColor()}`}>{dpi} DPI</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cores</span>
              <span className="text-xs font-black uppercase">{colorMode === 'color' ? '🎨 Colorido' : '🌑 P&B'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 glass-panel rounded-[3rem] p-12 flex items-center justify-center overflow-auto checkerboard relative shadow-inner">
          {isProcessing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Renderizando Documento...</p>
            </div>
          )}
          <div 
            style={{ 
              width: orientation === 'portrait' ? '420px' : `${420 * (paperSize.w/paperSize.h)}px`, 
              height: orientation === 'portrait' ? `${420 * (paperSize.h/paperSize.w)}px` : '420px', 
              backgroundColor: 'white', 
              flexShrink: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: hasOutline ? `${outlineWidth}px solid ${outlineColor}` : '1px solid #e2e8f0',
              filter: colorMode === 'grayscale' ? 'grayscale(100%)' : 'none'
            }} 
            className="shadow-2xl relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute inset-0 overflow-hidden">
              {image && (
                <img 
                  src={image} 
                  style={{
                    position: 'absolute', left: `${position.x}%`, top: `${position.y}%`,
                    transform: `translate(-50%, -50%) scale(${scale/100})`,
                    width: fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto'),
                    height: fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%'),
                    objectFit: fitMode
                  }}
                  className="transition-all duration-300 pointer-events-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print-canvas-area" style={{ display: 'none' }}>
        {image && (
          <div className="print-img-wrap">
            <img src={image} className="print-img" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintMasterPro;
