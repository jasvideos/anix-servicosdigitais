
import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useRef, useState } from 'react';
import { removeBackgroundAI } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker para o pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PrintItem {
  id: string;
  src: string;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  x: number;
  y: number;
  fitMode: 'contain' | 'cover';
  pageIndex: number;
}

const PrintMasterPro: React.FC = () => {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState({ name: 'A4', w: 210, h: 297 });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dpi, setDpi] = useState(0);
  const [hasBorder, setHasBorder] = useState(false);
  const [borderWidth, setBorderWidth] = useState(1); // in mm
  const [borderColor, setBorderColor] = useState('#000000');
  const [showFullSize, setShowFullSize] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find(i => i.id === selectedId) || null;

  const currentItems = items.filter(i => i.pageIndex === currentPage);

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
    if (selectedItem) {
      const paperWidthInches = paperSize.w / 25.4;
      const paperHeightInches = paperSize.h / 25.4;
      let occupiedWidthInches = paperWidthInches;
      
      if (selectedItem.fitMode === 'contain') {
        const paperRatio = paperSize.w / paperSize.h;
        const imgRatio = selectedItem.width / selectedItem.height;
        if (imgRatio > paperRatio) {
          occupiedWidthInches = paperWidthInches;
        } else {
          occupiedWidthInches = paperHeightInches * imgRatio;
        }
      }

      const finalWidthOnPaperInches = occupiedWidthInches * (selectedItem.scale / 100);
      const currentDpi = selectedItem.width / finalWidthOnPaperInches;
      setDpi(Math.round(currentDpi));
    } else {
      setDpi(0);
    }
  }, [selectedItem, paperSize]);

  const updateSelectedItem = (updates: Partial<PrintItem>) => {
    if (!selectedId) return;
    setItems(prev => prev.map(item => item.id === selectedId ? { ...item, ...updates } : item));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file, index) => {
      const id = Math.random().toString(36).substr(2, 9);
      const targetPage = currentPage + index;
      setPageCount(prev => Math.max(prev, targetPage + 1));

      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (!event.target?.result) return;
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
          try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 3.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
              await page.render({ canvasContext: context, viewport: viewport }).promise;
              const imgData = canvas.toDataURL('image/jpeg');
              setItems(prev => [...prev, {
                id,
                src: imgData,
                width: canvas.width,
                height: canvas.height,
                scale: 100,
                rotation: 0,
                x: 50,
                y: 50,
                fitMode: 'contain',
                pageIndex: targetPage
              }]);
              setSelectedId(id);
            }
          } catch (error) {
            alert('Erro ao ler PDF');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            setItems(prev => [...prev, {
              id,
              src: event.target?.result as string,
              width: img.width,
              height: img.height,
              scale: 100,
              rotation: 0,
              x: 50,
              y: 50,
              fitMode: 'contain',
              pageIndex: targetPage
            }]);
            setSelectedId(id);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const upscaleImage = async () => {
    if (!selectedItem) return;

    // Safe check for AI Studio environment
    try {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }
    } catch (e) {
      console.warn("AI Studio integration skipped");
    }

    setIsProcessing(true);
    try {
      const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || localStorage.getItem('anix_api_key') || "";
      const ai = new GoogleGenAI({ apiKey });
      const base64 = selectedItem.src.includes(',') ? selectedItem.src.split(',')[1] : selectedItem.src;
      
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
            const img = new Image();
            img.onload = () => {
              updateSelectedItem({ src: upscaled, width: img.width, height: img.height });
            };
            img.src = upscaled;
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found") && (window as any).aistudio) {
        alert("Erro de chave de API. Por favor, selecione uma chave válida de um projeto com faturamento ativo.");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert(`Falha na melhoria de resolução por IA: ${err.message || "Erro desconhecido"}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const removeBg = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    const result = await removeBackgroundAI(selectedItem.src.split(',')[1]);
    if (result) {
      const img = new Image();
      img.onload = () => {
        updateSelectedItem({ src: result, width: img.width, height: img.height });
      };
      img.src = result;
    }
    setIsProcessing(false);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setItems(prev => prev.filter(i => i.id !== selectedId));
    setSelectedId(null);
  };

  const handlePrint = () => { window.focus(); window.print(); };
  const getDpiColor = () => dpi >= 300 ? 'text-emerald-500' : dpi >= 150 ? 'text-amber-500' : 'text-rose-500';

  const saveAsPNG = () => {
    const pageItems = items.filter(i => i.pageIndex === currentPage);
    if (pageItems.length === 0) return;
    
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

    // Load all images first
    const loadPromises = pageItems.map(item => new Promise<{ img: HTMLImageElement, item: PrintItem }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, item });
      img.src = item.src;
    }));

    Promise.all(loadPromises).then(loadedItems => {
      loadedItems.forEach(({ img, item }) => {
        const paperRatio = paperSize.w / paperSize.h;
        const imgRatio = img.width / img.height;
        let baseW, baseH;

        if (item.fitMode === 'cover') {
          if (imgRatio > paperRatio) { baseH = paperSize.h; baseW = baseH * imgRatio; } 
          else { baseW = paperSize.w; baseH = baseW / imgRatio; }
        } else {
          if (imgRatio > paperRatio) { baseW = paperSize.w; baseH = baseW / imgRatio; } 
          else { baseH = paperSize.h; baseW = baseH * imgRatio; }
        }

        const finalW = baseW * (item.scale / 100) * dpiScale;
        const finalH = baseH * (item.scale / 100) * dpiScale;
        const centerX = (paperSize.w * (item.x / 100)) * dpiScale;
        const centerY = (paperSize.h * (item.y / 100)) * dpiScale;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(img, -(finalW / 2), -(finalH / 2), finalW, finalH);
        ctx.restore();
      });

      ctx.restore();

      if (hasBorder) {
        const bwPx = borderWidth * dpiScale;
        ctx.strokeStyle = borderColor; ctx.lineWidth = bwPx;
        ctx.strokeRect(bwPx/2, bwPx/2, widthPx - bwPx, heightPx - bwPx);
      }

      const link = document.createElement('a'); link.download = `printmaster-${paperSize.name}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    });
  };

  const handleViewRealSize = () => {
    const pageItems = items.filter(i => i.pageIndex === currentPage);
    if (pageItems.length === 0) return;
    setIsProcessing(true);

    // Timeout para permitir que a UI mostre o estado de carregamento antes do processamento pesado
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { setIsProcessing(false); return; }

      const dpiScale = 11.811; // 300 DPI
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

      const loadPromises = pageItems.map(item => new Promise<{ img: HTMLImageElement, item: PrintItem }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ img, item });
        img.src = item.src;
      }));

      Promise.all(loadPromises).then(loadedItems => {
        loadedItems.forEach(({ img, item }) => {
          const paperRatio = paperSize.w / paperSize.h;
          const imgRatio = img.width / img.height;
          let baseW, baseH;

          if (item.fitMode === 'cover') {
            if (imgRatio > paperRatio) { baseH = paperSize.h; baseW = baseH * imgRatio; } 
            else { baseW = paperSize.w; baseH = baseW / imgRatio; }
          } else {
            if (imgRatio > paperRatio) { baseW = paperSize.w; baseH = baseW / imgRatio; } 
            else { baseH = paperSize.h; baseW = baseH * imgRatio; }
          }

          const finalW = baseW * (item.scale / 100) * dpiScale;
          const finalH = baseH * (item.scale / 100) * dpiScale;
          const centerX = (paperSize.w * (item.x / 100)) * dpiScale;
          const centerY = (paperSize.h * (item.y / 100)) * dpiScale;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.drawImage(img, -(finalW / 2), -(finalH / 2), finalW, finalH);
          ctx.restore();
        });

        ctx.restore();

        if (hasBorder) {
          const bwPx = borderWidth * dpiScale;
          ctx.strokeStyle = borderColor; ctx.lineWidth = bwPx;
          ctx.strokeRect(bwPx/2, bwPx/2, widthPx - bwPx, heightPx - bwPx);
        }

        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
        setShowFullSize(true);
        setIsProcessing(false);
      });
    }, 100);
  };

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-[85vh] print:block print:h-auto print:animate-none">
      <style>{`
        @media print {
          .print-canvas-area { position: fixed; left: 0; top: 0; width: ${paperSize.w}mm; height: ${paperSize.h}mm; background: white; overflow: hidden; display: block !important; z-index: 9999; box-sizing: border-box; border: ${hasBorder ? `${borderWidth}mm solid ${borderColor}` : 'none'}; }
          .print-img-wrap { position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); }
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
              Importar Arquivos
              <input type="file" multiple ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.gif,.png,.svg,.psd,.webp,.raw,.tiff,.tif,.bmp,.pdf,image/*,application/pdf" onChange={handleFileUpload} />
            </button>
            
            {selectedItem ? (
              <>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={upscaleImage} disabled={isProcessing} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-700 border border-indigo-100 shadow-lg">Super-Resolução IA</button>
              <button onClick={removeBg} disabled={isProcessing} className="bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-100 border border-emerald-100">Remover Fundo</button>
            </div>
              </>
            ) : (
              <div className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">Selecione uma imagem para editar</div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePrint} disabled={items.length === 0 || isProcessing} className="bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-50">Imprimir ({pageCount})</button>
                <button onClick={handlePrint} disabled={items.length === 0 || isProcessing} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-black disabled:opacity-50">P&B</button>
            </div>

            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-2xl">
               <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 hover:bg-white rounded-lg disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
               <div className="text-center">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Página</span>
                 <span className="text-sm font-black text-slate-900">{currentPage + 1} / {pageCount}</span>
               </div>
               <button onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))} disabled={currentPage === pageCount - 1} className="p-2 hover:bg-white rounded-lg disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
               <button onClick={() => { setPageCount(p => p + 1); setCurrentPage(pageCount); }} className="ml-2 bg-indigo-100 text-indigo-600 p-2 rounded-lg hover:bg-indigo-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
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

            {selectedItem && (
              <>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Escala ({selectedItem.scale}%)</label>
              <input type="range" min="10" max="500" value={selectedItem.scale} onChange={(e) => updateSelectedItem({ scale: Number(e.target.value) })} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Rotação ({selectedItem.rotation}°)</label>
              <div className="flex gap-2">
                {[0, 90, 180, 270].map(deg => (
                  <button key={deg} onClick={() => updateSelectedItem({ rotation: deg })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedItem.rotation === deg ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>{deg}°</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Posição X</label>
                <input type="range" min="0" max="100" value={selectedItem.x} onChange={(e) => updateSelectedItem({ x: Number(e.target.value) })} className="w-full accent-slate-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Posição Y</label>
                <input type="range" min="0" max="100" value={selectedItem.y} onChange={(e) => updateSelectedItem({ y: Number(e.target.value) })} className="w-full accent-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enquadramento</label>
              <div className="flex gap-2">
                <button onClick={() => updateSelectedItem({ fitMode: 'contain' })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedItem.fitMode === 'contain' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>Ajustar</button>
                <button onClick={() => updateSelectedItem({ fitMode: 'cover' })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedItem.fitMode === 'cover' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>Preencher</button>
              </div>
            </div>
            
            <button onClick={deleteSelected} className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-100 border border-rose-100 transition-all">Remover Item Selecionado</button>
              </>
            )}
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
          {currentItems.length > 0 && (
            <div className="flex gap-3">
              <button onClick={handleViewRealSize} disabled={isProcessing} className="bg-white text-slate-600 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50">
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
              {currentItems.map(item => (
                <img 
                  key={item.id}
                  src={item.src} 
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    position: 'absolute', left: `${item.x}%`, top: `${item.y}%`,
                    transform: `translate(-50%, -50%) scale(${item.scale/100}) rotate(${item.rotation}deg)`,
                    width: item.fitMode === 'cover' ? (item.width/item.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (item.width/item.height > paperSize.w/paperSize.h ? '100%' : 'auto'),
                    height: item.fitMode === 'cover' ? (item.width/item.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (item.width/item.height > paperSize.w/paperSize.h ? 'auto' : '100%'),
                    objectFit: item.fitMode,
                    border: selectedId === item.id ? '2px solid #4f46e5' : 'none',
                    zIndex: selectedId === item.id ? 10 : 1,
                    cursor: 'pointer'
                  }}
                  className="transition-all duration-300"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print-canvas-area">
        {Array.from({ length: pageCount }).map((_, pIndex) => (
          <div key={pIndex} className="print-page">
            {items.filter(i => i.pageIndex === pIndex).map(item => (
                <div key={item.id} className="print-img-wrap" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                  <img 
                    src={item.src} 
                    style={{
                        transform: `scale(${item.scale/100}) rotate(${item.rotation}deg)`,
                        width: item.fitMode === 'cover' ? (item.width/item.height > paperSize.w/paperSize.h ? 'auto' : '100%') : (item.width/item.height > paperSize.w/paperSize.h ? '100%' : 'auto'),
                        height: item.fitMode === 'cover' ? (item.width/item.height > paperSize.w/paperSize.h ? '100%' : 'auto') : (item.width/item.height > paperSize.w/paperSize.h ? 'auto' : '100%')
                    }}
                  />
                </div>
            ))}
          </div>
        ))}
      </div>

      {showFullSize && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setShowFullSize(false)}>
          <div className="relative w-full h-full overflow-auto flex items-center justify-center" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowFullSize(false)} className="fixed top-6 right-6 bg-white text-slate-900 p-3 rounded-full shadow-2xl z-[110] hover:bg-rose-50 hover:text-rose-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
             <img src={previewUrl} className="max-w-none shadow-2xl" style={{ transform: 'scale(1)' }} alt="Full Size Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintMasterPro;
