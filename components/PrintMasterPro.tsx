
import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useRef, useState } from 'react';
import { removeBackgroundAI } from '../services/geminiService';

const PrintMasterPro: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [paperSize, setPaperSize] = useState({ name: 'A4', w: 210, h: 297 });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dpi, setDpi] = useState(0);
  const [showCropMarks, setShowCropMarks] = useState(false);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setDimensions({ width: img.width, height: img.height });
          setOriginalImage(event.target?.result as string);
          setImage(event.target?.result as string);
          setScale(100);
          setPosition({ x: 50, y: 50 });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawCropMarks = (ctx: CanvasRenderingContext2D, w: number, h: number, size: number) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, 0); ctx.lineTo(size, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - size, 0); ctx.lineTo(w, 0); ctx.lineTo(w, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h - size); ctx.lineTo(0, h); ctx.lineTo(size, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - size, h); ctx.lineTo(w, h); ctx.lineTo(w, h - size); ctx.stroke();
  };

  const upscaleImage = async () => {
    if (!image) return;

    // Check for API Key first (Required for gemini-3-pro-image-preview)
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success after dialog opens as per instructions
    }

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: 'Perform a 2x super-resolution reconstruction of this image. Focus on sharpening textures and removing artifacts while preserving the original aspect ratio.' }
          ]
        },
        config: {
            imageConfig: { imageSize: "2K" }
        }
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
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        alert("Erro de chave de API. Por favor, selecione uma chave válida de um projeto com faturamento ativo.");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert("Falha na melhoria de resolução por IA. Verifique sua conexão ou cota da API.");
      }
    } finally {
      setIsProcessing(false);
    }
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

  const handlePrint = () => { window.focus(); window.print(); };
  const getDpiColor = () => dpi >= 300 ? 'text-emerald-500' : dpi >= 150 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-[85vh]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-canvas-area, .print-canvas-area * { visibility: visible; }
          .print-canvas-area { position: absolute; left: 0; top: 0; width: ${paperSize.w}mm; height: ${paperSize.h}mm; background: white; overflow: hidden; }
          .print-img-wrap { position: absolute; left: ${position.x}%; top: ${position.y}%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); }
          .print-img { transform: scale(${scale/100}); width: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto')}; height: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%')}; }
          .print-crop-mark { position: absolute; width: 10mm; height: 10mm; border: 0.5pt solid black; z-index: 50; }
          .cm-tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
          .cm-tr { top: 0; right: 0; border-left: 0; border-bottom: 0; }
          .cm-bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
          .cm-br { bottom: 0; right: 0; border-left: 0; border-top: 0; }
          @page { size: ${paperSize.w}mm ${paperSize.h}mm; margin: 0; }
        }
        .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.3); }
        .checkerboard { background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px; }
        .crop-mark-preview { position: absolute; width: 20px; height: 20px; border: 1.5px solid black; pointer-events: none; z-index: 100; }
      `}</style>

      <div className="lg:col-span-4 flex flex-col gap-6 no-print">
        <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl space-y-8 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">PrintMaster <span className="text-indigo-600">Pro</span></h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">A1-A4 Advanced Finisher</p>
            </div>
            {isProcessing && <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>}
          </div>

          <div className="space-y-4">
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
              Importar Imagem
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={upscaleImage} disabled={isProcessing} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-700 border border-indigo-100 shadow-lg">Super-Resolução IA</button>
              <button onClick={removeBg} disabled={isProcessing} className="bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-100 border border-emerald-100">Remover Fundo</button>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Papel e Acabamento</label>
              <div className="flex gap-2">
                <button onClick={() => setOrientation('portrait')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${orientation === 'portrait' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>📄 Retrato</button>
                <button onClick={() => setOrientation('landscape')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${orientation === 'landscape' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>📂 Paisagem</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(p => {
                  const isActive = (orientation === 'portrait' ? (paperSize.w === Math.min(p.w, p.h)) : (paperSize.w === Math.max(p.w, p.h)));
                  return (
                    <button key={p.name} onClick={() => setPaperSize(orientation === 'portrait' ? { ...p, w: Math.min(p.w, p.h), h: Math.max(p.w, p.h) } : { ...p, w: Math.max(p.w, p.h), h: Math.min(p.w, p.h) })} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>{p.name}</button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Marcas de Corte (Físico)</label>
                  <div onClick={() => setShowCropMarks(!showCropMarks)} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${showCropMarks ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${showCropMarks ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Escala ({scale}%)</label>
              <input type="range" min="10" max="500" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Posição X</label>
                <input type="range" min="0" max="100" value={position.x} onChange={(e) => setPosition(p => ({ ...p, x: Number(e.target.value) }))} className="w-full accent-slate-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Posição Y</label>
                <input type="range" min="0" max="100" value={position.y} onChange={(e) => setPosition(p => ({ ...p, y: Number(e.target.value) }))} className="w-full accent-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enquadramento</label>
              <div className="flex gap-2">
                <button onClick={() => setFitMode('contain')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${fitMode === 'contain' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>Ajustar</button>
                <button onClick={() => setFitMode('cover')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${fitMode === 'cover' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>Preencher</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-6">
            <button onClick={handlePrint} disabled={!image || isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 disabled:opacity-30">Imprimir</button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6 no-print">
        <div className="flex justify-between items-center glass-panel px-8 py-5 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Resolução Calculada</span>
              <span className={`text-3xl font-black italic tracking-tighter ${getDpiColor()}`}>{dpi} DPI</span>
            </div>
            <div className="h-10 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Qualidade</span>
              <span className={`text-[11px] font-black uppercase ${getDpiColor()}`}>{dpi >= 300 ? '✅ Excelente' : dpi >= 150 ? '⚠️ Boa' : '❌ Baixa'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 glass-panel rounded-[3rem] p-12 flex items-center justify-center overflow-auto checkerboard relative shadow-inner scrollbar-thin scrollbar-thumb-slate-300">
          <div 
            style={{ width: orientation === 'portrait' ? '450px' : `${450 * (paperSize.w/paperSize.h)}px`, height: orientation === 'portrait' ? `${450 * (paperSize.h/paperSize.w)}px` : '450px', backgroundColor: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            className="shadow-[0_50px_100px_rgba(0,0,0,0.15)] relative overflow-visible transition-all duration-500 border border-slate-200"
          >
            {showCropMarks && (
              <>
                <div className="crop-mark-preview cm-tl" style={{ top: '-1px', left: '-1px', borderRight: 0, borderBottom: 0 }}></div>
                <div className="crop-mark-preview cm-tr" style={{ top: '-1px', right: '-1px', borderLeft: 0, borderBottom: 0 }}></div>
                <div className="crop-mark-preview cm-bl" style={{ bottom: '-1px', left: '-1px', borderRight: 0, borderTop: 0 }}></div>
                <div className="crop-mark-preview cm-br" style={{ bottom: '-1px', right: '-1px', borderLeft: 0, borderTop: 0 }}></div>
              </>
            )}

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

      <div className="hidden print-canvas-area">
        {image && (
          <>
            <div className="print-img-wrap">
              <img src={image} className="print-img" />
            </div>
            {showCropMarks && (
              <>
                <div className="print-crop-mark cm-tl"></div>
                <div className="print-crop-mark cm-tr"></div>
                <div className="print-crop-mark cm-bl"></div>
                <div className="print-crop-mark cm-br"></div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PrintMasterPro;
