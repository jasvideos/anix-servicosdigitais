
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
  const [hasBorder, setHasBorder] = useState(false);
  const [borderWidth, setBorderWidth] = useState(1); // in mm
  const [borderColor, setBorderColor] = useState('#000000');
  const [showFullSize, setShowFullSize] = useState(false);

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

  const saveAsPNG = () => {
    if (!image) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpiScale = 11.811; // 300 DPI (pixels per mm)
    const widthPx = paperSize.w * dpiScale;
    const heightPx = paperSize.h * dpiScale;

    canvas.width = widthPx;
    canvas.height = heightPx;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthPx, heightPx);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, widthPx, heightPx);
    ctx.clip();

    const img = new Image();
    img.onload = () => {
      const paperRatio = paperSize.w / paperSize.h;
      const imgRatio = img.width / img.height;
      let baseW, baseH;

      if (fitMode === 'cover') {
        if (imgRatio > paperRatio) { baseH = paperSize.h; baseW = baseH * imgRatio; } 
        else { baseW = paperSize.w; baseH = baseW / imgRatio; }
      } else {
        if (imgRatio > paperRatio) { baseW = paperSize.w; baseH = baseW / imgRatio; } 
        else { baseH = paperSize.h; baseW = baseH * imgRatio; }
      }

      const finalW = baseW * (scale / 100) * dpiScale;
      const finalH = baseH * (scale / 100) * dpiScale;
      const centerX = (paperSize.w * (position.x / 100)) * dpiScale;
      const centerY = (paperSize.h * (position.y / 100)) * dpiScale;

      ctx.drawImage(img, centerX - (finalW / 2), centerY - (finalH / 2), finalW, finalH);
      ctx.restore();

      if (hasBorder) {
        const bwPx = borderWidth * dpiScale;
        ctx.strokeStyle = borderColor; ctx.lineWidth = bwPx;
        ctx.strokeRect(bwPx/2, bwPx/2, widthPx - bwPx, heightPx - bwPx);
      }

      const link = document.createElement('a'); link.download = `printmaster-${paperSize.name}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    };
    img.src = image;
  };

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-[85vh] print:block print:h-auto print:animate-none">
      <style>{`
        @media print {
          .print-canvas-area { position: fixed; left: 0; top: 0; width: ${paperSize.w}mm; height: ${paperSize.h}mm; background: white; overflow: hidden; display: block !important; z-index: 9999; box-sizing: border-box; border: ${hasBorder ? `${borderWidth}mm solid ${borderColor}` : 'none'}; }
          .print-img-wrap { position: absolute; left: ${position.x}%; top: ${position.y}%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); }
          .print-img { transform: scale(${scale/100}); width: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto')}; height: ${fitMode === 'cover' ? (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (dimensions.width/dimensions.height > paperSize.w/paperSize.h ? 'auto' : '100%')}; }
          @page { size: ${paperSize.w}mm ${paperSize.h}mm; margin: 0; }
        }
        .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.3); }
        .checkerboard { background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px; }
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
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePrint} disabled={!image || isProcessing} className="bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-50">Imprimir Colorido</button>
                <button onClick={handlePrint} disabled={!image || isProcessing} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-black disabled:opacity-50">Imprimir P&B</button>
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
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Contorno da Impressão</label>
                  <div onClick={() => setHasBorder(!hasBorder)} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${hasBorder ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${hasBorder ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {hasBorder && (
                  <div className="space-y-3 pt-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-10 h-10 p-1 border border-slate-200 rounded-lg bg-white cursor-pointer" />
                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-bold text-slate-500">
                          <span>Espessura</span>
                          <span>{borderWidth}mm</span>
                        </div>
                        <input type="range" min="0.5" max="10" step="0.1" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
                      </div>
                    </div>
                  </div>
                )}
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
          {image && (
            <div className="flex gap-3">
              <button onClick={() => setShowFullSize(true)} className="bg-white text-slate-600 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg> Ver Real
              </button>
              <button onClick={saveAsPNG} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">Salvar PNG</button>
            </div>
          )}
        </div>

        <div className="flex-1 glass-panel rounded-[3rem] p-12 flex items-center justify-center overflow-auto checkerboard relative shadow-inner scrollbar-thin scrollbar-thumb-slate-300">
          <div 
            style={{ 
              width: orientation === 'portrait' ? '450px' : `${450 * (paperSize.w/paperSize.h)}px`, 
              height: orientation === 'portrait' ? `${450 * (paperSize.h/paperSize.w)}px` : '450px', 
              backgroundColor: 'white', 
              flexShrink: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: hasBorder ? `${borderWidth * 2}px solid ${borderColor}` : '1px solid #e2e8f0',
              boxSizing: 'border-box'
            }} 
            className="shadow-[0_50px_100px_rgba(0,0,0,0.15)] relative overflow-visible transition-all duration-500"
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

      <div className="hidden print-canvas-area">
        {image && (
          <>
            <div className="print-img-wrap">
              <img src={image} className="print-img" />
            </div>
          </>
        )}
      </div>

      {showFullSize && image && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setShowFullSize(false)}>
          <div className="relative w-full h-full overflow-auto flex items-center justify-center" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowFullSize(false)} className="fixed top-6 right-6 bg-white text-slate-900 p-3 rounded-full shadow-2xl z-[110] hover:bg-rose-50 hover:text-rose-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
             <img src={image} className="max-w-none shadow-2xl" style={{ transform: 'scale(1)' }} alt="Full Size" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintMasterPro;
