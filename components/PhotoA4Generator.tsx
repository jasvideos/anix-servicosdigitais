
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { removeBackgroundAI } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker para o pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PhotoItem {
  id: string;
  src: string;
  zoom: number;
  rotation: number;
  posX: number;
  posY: number;
  widthMm: number;
  heightMm: number;
}

const POLAROID_SIDE_MARGIN_RATIO = 0.10; 
const POLAROID_TOP_MARGIN_RATIO = 0.10;  
const POLAROID_BOTTOM_MARGIN_RATIO = 0.17; 
const POLAROID_HEIGHT_RATIO = 1.25; 

const PAINT_COLORS = [
  '#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7'
];

const PhotoA4Generator: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPolaroid, setIsPolaroid] = useState(false);
  const [gapMm, setGapMm] = useState(5);
  const [pageSize] = useState({ name: 'A4', w: 210, h: 297 });

  const [hasBorder, setHasBorder] = useState(true);
  const [borderColor, setBorderColor] = useState('#334155');
  const [borderWidthMm, setBorderWidthMm] = useState(0.5);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialPosX: 0, initialPosY: 0 });
  const [isProcessingIA, setIsProcessingIA] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstSelected = photos.find(p => selectedIds.includes(p.id));

  const mmToPxPreview = 2.2; // Escala visual constante

  const pages = useMemo(() => {
    const pagesList: PhotoItem[][] = [[]];
    const marginMm = 8; 
    const sheetW = orientation === 'portrait' ? pageSize.w : pageSize.h;
    const sheetH = orientation === 'portrait' ? pageSize.h : pageSize.w;
    const availableW = sheetW - (marginMm * 2);
    const availableH = sheetH - (marginMm * 2);

    let currentX = 0;
    let currentY = 0;
    let currentRowHeight = 0;
    let currentPageIndex = 0;

    photos.forEach((photo) => {
      const pW = photo.widthMm;
      const pH = isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : photo.heightMm;

      if (currentX + pW > availableW + 0.1) {
        currentX = 0;
        currentY += currentRowHeight + gapMm;
        currentRowHeight = 0;
      }

      if (currentY + pH > availableH + 0.1) {
        currentPageIndex++;
        pagesList[currentPageIndex] = [];
        currentX = 0;
        currentY = 0;
        currentRowHeight = 0;
      }

      if (pagesList[currentPageIndex]) {
        pagesList[currentPageIndex].push(photo);
      }
      currentX += pW + gapMm;
      currentRowHeight = Math.max(currentRowHeight, pH);
    });

    return pagesList.filter(p => p.length > 0);
  }, [photos, orientation, gapMm, isPolaroid, pageSize]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
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
                const src = canvas.toDataURL('image/jpeg');
                const id = Math.random().toString(36).substr(2, 9);
                setPhotos(prev => [...prev, {
                  id,
                  src,
                  zoom: 1.0,
                  rotation: 0,
                  posX: 0,
                  posY: 0,
                  widthMm: 80,
                  heightMm: 100
                }]);
              }
            } catch (error) {
              console.error('Erro PDF:', error);
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const id = Math.random().toString(36).substr(2, 9);
            const src = event.target?.result as string;
            if (src) {
              setPhotos(prev => [...prev, {
                id,
                src,
                zoom: 1.0,
                rotation: 0,
                posX: 0,
                posY: 0,
                widthMm: 80,
                heightMm: 100
              }]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p.id));
    }
  };

  const updatePhotos = (updates: Partial<PhotoItem>) => {
    setPhotos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, ...updates } : p));
  };

  // Fix line 109 and optimize removeBackgroundAI call
  const handleRemoveBackground = async () => {
    if (selectedIds.length === 0) {
      alert("Selecione pelo menos uma foto para remover o fundo.");
      return;
    }
    
    setIsProcessingIA(true);
    try {
      const updatedPhotos = [...photos];
      let hasError = false;

      for (let i = 0; i < updatedPhotos.length; i++) {
        if (selectedIds.includes(updatedPhotos[i].id)) {
          // Pass the base64 string directly
          const result = await removeBackgroundAI(updatedPhotos[i].src);
          if (result) {
            updatedPhotos[i] = { ...updatedPhotos[i], src: result };
          } else {
            hasError = true;
          }
        }
      }
      
      setPhotos(updatedPhotos);
      if (hasError) alert("Algumas imagens não puderam ser processadas.");
    } catch (err) {
      console.error(err);
      alert("Falha ao processar remoção de fundo com IA.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const applyAutoCrop = () => {
    if (selectedIds.length === 0) return;
    setPhotos(prev => prev.map(photo => {
      if (!selectedIds.includes(photo.id)) return photo;
      return {
        ...photo,
        zoom: 1.15,
        posX: 0,
        posY: 0
      };
    }));
  };

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const itemsToDuplicate = photos.filter(p => selectedIds.includes(p.id));
    const newItems = itemsToDuplicate.map(p => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setPhotos(prev => [...prev, ...newItems]);
  };

  const removeSelected = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (selectedIds.length === 0) return;
    if (window.confirm(`Remover ${selectedIds.length} foto(s) selecionada(s)?`)) {
      setPhotos(current => current.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, photo: PhotoItem) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setDraggingId(photo.id);
    setDragStart({ x: clientX, y: clientY, initialPosX: photo.posX, initialPosY: photo.posY });
    
    if (!selectedIds.includes(photo.id)) {
      if ('ctrlKey' in e && (e as React.MouseEvent).ctrlKey) {
        setSelectedIds(prev => [...prev, photo.id]);
      } else {
        setSelectedIds([photo.id]);
      }
    }
  };

  const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
    if (!draggingId) return;
    const clientX = (e instanceof MouseEvent) ? e.clientX : (e as TouchEvent).touches[0].clientX;
    const clientY = (e instanceof MouseEvent) ? e.clientY : (e as TouchEvent).touches[0].clientY;
    const deltaX = (clientX - dragStart.x);
    const deltaY = (clientY - dragStart.y);
    setPhotos(prev => prev.map(p => p.id === draggingId ? { ...p, posX: dragStart.initialPosX + deltaX, posY: dragStart.initialPosY + deltaY } : p));
  };

  const handleGlobalEnd = () => setDraggingId(null);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchmove', handleGlobalMove);
      window.addEventListener('touchend', handleGlobalEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [draggingId, dragStart]);

  const saveAsPNG = async (pageIndex: number) => {
    const dpiFactor = 11.811; // 300 DPI
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (orientation === 'portrait' ? pageSize.w : pageSize.h) * dpiFactor;
    const h = (orientation === 'portrait' ? pageSize.h : pageSize.w) * dpiFactor;
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h);

    const marginMm = 8;
    const pagePhotos = pages[pageIndex];
    let currentX = marginMm * dpiFactor;
    let currentY = marginMm * dpiFactor;
    let currentRowHeight = 0;

    for (const photo of pagePhotos) {
      const pW = photo.widthMm * dpiFactor;
      const pH = (isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : photo.heightMm) * dpiFactor;
      if (currentX + pW > (w - marginMm * dpiFactor + 1)) { currentX = marginMm * dpiFactor; currentY += currentRowHeight + (gapMm * dpiFactor); currentRowHeight = 0; }
      const img = new Image(); img.src = photo.src;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      ctx.save();
      ctx.translate(currentX, currentY);
      if (isPolaroid) {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, pW, pH);
        ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.4 * dpiFactor; ctx.strokeRect(0, 0, pW, pH);
      } else if (hasBorder) {
        ctx.strokeStyle = borderColor; ctx.lineWidth = borderWidthMm * dpiFactor; ctx.strokeRect(0, 0, pW, pH);
      }
      const clipX = isPolaroid ? (pW * POLAROID_SIDE_MARGIN_RATIO) : 0;
      const clipY = isPolaroid ? (pW * POLAROID_TOP_MARGIN_RATIO) : 0;
      const clipW = isPolaroid ? pW - (pW * POLAROID_SIDE_MARGIN_RATIO * 2) : pW;
      const clipH = isPolaroid ? pH - (pW * POLAROID_TOP_MARGIN_RATIO) - (pH * POLAROID_BOTTOM_MARGIN_RATIO) : pH;
      ctx.save(); ctx.beginPath(); ctx.rect(clipX, clipY, clipW, clipH); ctx.clip();
      const imgRatio = img.width / img.height;
      const clipRatio = clipW / clipH;
      let drawW, drawH;
      if (imgRatio > clipRatio) { drawW = clipW; drawH = clipW / imgRatio; } else { drawH = clipH; drawW = clipH * imgRatio; }
      const finalScale = photo.zoom;
      const moveX = (photo.posX * (dpiFactor / mmToPxPreview));
      const moveY = (photo.posY * (dpiFactor / mmToPxPreview));
      const centerX = clipX + (clipW / 2); const centerY = clipY + (clipH / 2);
      ctx.translate(centerX + moveX, centerY + moveY);
      ctx.rotate((photo.rotation * Math.PI) / 180);
      ctx.scale(finalScale, finalScale);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore(); ctx.restore();
      currentX += pW + (gapMm * dpiFactor);
      currentRowHeight = Math.max(currentRowHeight, pH);
    }
    const link = document.createElement('a');
    link.download = `Anix_Folha_${pageIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const renderPhotoContent = (photo: PhotoItem, isPrint: boolean) => {
    const factor = isPrint ? 1 : mmToPxPreview;
    const unit = isPrint ? 'mm' : 'px';
    const width = photo.widthMm * factor;
    const height = (isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : photo.heightMm) * factor;
    return (
      <div key={photo.id}
        onMouseDown={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        style={{ width: `${width}${unit}`, height: `${height}${unit}`, position: 'relative', border: isPolaroid ? `${0.4 * factor}${unit} solid #cbd5e1` : (hasBorder ? `${borderWidthMm * factor}${unit} solid ${borderColor}` : 'none'), boxSizing: 'border-box', overflow: 'hidden', backgroundColor: isPolaroid ? 'white' : '#ffffff', boxShadow: isPolaroid && !isPrint ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}
        className={`transition-all cursor-move select-none ${!isPrint && selectedIds.includes(photo.id) ? 'ring-4 ring-blue-500 ring-inset z-20 shadow-2xl scale-[1.02]' : ''}`}>
        <div className="w-full h-full relative" style={{ padding: isPolaroid ? `${width * POLAROID_TOP_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit} ${height * POLAROID_BOTTOM_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit}` : '0' }}>
          <div className="w-full h-full relative overflow-hidden bg-slate-50" style={{ border: isPolaroid ? `${0.4 * factor}${unit} solid #94a3b8` : 'none', boxSizing: 'border-box' }}>
            <img src={photo.src} style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${photo.posX}px, ${photo.posY}px) scale(${photo.zoom}) rotate(${photo.rotation}deg)`, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} draggable={false} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-full print:block print:h-auto print:animate-none">
      <style>{`
        @media print {
          .print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; min-height: 100%; background: white; display: block !important; z-index: 9999; }
          .print-page { width: ${orientation === 'portrait' ? pageSize.w : pageSize.h}mm; height: ${orientation === 'portrait' ? pageSize.h : pageSize.w}mm; display: flex; flex-wrap: wrap; gap: ${gapMm}mm; justify-content: flex-start; align-content: flex-start; padding: 8mm; box-sizing: border-box; page-break-after: always; margin: 0 auto; }
        }
        .checkerboard { background-image: linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%); background-size: 20px 20px; }
      `}</style>

      {/* PAINEL LATERAL */}
      <div className="lg:col-span-4 flex flex-col gap-5 no-print overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-200 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Fotos <span className="text-blue-600">A4</span></h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic text-indigo-600 mt-1">Estúdio de Impressão Pro</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              Adicionar Fotos
              <input type="file" multiple ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.gif,.png,.svg,.psd,.webp,.raw,.tiff,.tif,.bmp,.pdf,image/*,application/pdf" onChange={handleFileUpload} />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-slate-100 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest border border-slate-200 hover:bg-slate-200 transition-colors">
                {orientation === 'portrait' ? '📄 Retrato' : '📂 Paisagem'}
              </button>
              <button onClick={() => setIsPolaroid(!isPolaroid)} className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${isPolaroid ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-900 border-slate-200'}`}>
                📸 Polaroid
              </button>
            </div>
          </div>

          {/* ÁREA DE EDIÇÃO DINÂMICA */}
          <div className="space-y-5">
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                  Zoom {selectedIds.length > 0 ? `(${selectedIds.length})` : '(Preview)'}
                </label>
                <button 
                  onClick={applyAutoCrop} 
                  disabled={selectedIds.length === 0}
                  className="text-[8px] font-black text-white bg-indigo-600 px-3 py-1 rounded-lg uppercase tracking-tight disabled:opacity-30"
                >
                  ✂️ Recortar
                </button>
              </div>
              <input 
                type="range" min="0.1" max="10" step="0.01" 
                value={firstSelected?.zoom || 1} 
                onChange={(e) => updatePhotos({ zoom: Number(e.target.value) })} 
                disabled={selectedIds.length === 0}
                className="w-full accent-indigo-600 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-[8px] font-bold text-indigo-400 uppercase">
                <span>{firstSelected?.zoom.toFixed(2)}x</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-3">
              <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Girar Foto</label>
              <div className="flex gap-2">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => updatePhotos({ rotation: deg })}
                    className={`flex-1 py-2 rounded-xl font-black text-[9px] transition-all border ${
                      firstSelected?.rotation === deg
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Espaçamento Entre Fotos</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0" max="50" step="1" 
                  value={gapMm} 
                  onChange={(e) => setGapMm(Number(e.target.value))} 
                  className="flex-1 accent-slate-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="bg-white border border-slate-200 px-2 py-1 rounded-lg font-black text-[10px] text-slate-700 min-w-[40px] text-center">
                  {gapMm}mm
                </div>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-fade-in">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400">Largura (mm)</label>
                      <input type="number" value={firstSelected?.widthMm || 100} onChange={(e) => updatePhotos({ widthMm: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-black text-xs text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400">Altura (mm)</label>
                      <input type="number" value={firstSelected?.heightMm || 150} disabled={isPolaroid} onChange={(e) => updatePhotos({ heightMm: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-black text-xs text-blue-600 disabled:opacity-40" />
                    </div>
                 </div>

                 {/* BLOCO DE BORDA - MOVIDO PARA BAIXO DAS MEDIDAS */}
                 <div className="p-4 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Contorno (Borda)</label>
                      <div onClick={() => setHasBorder(!hasBorder)} className={`w-9 h-4.5 rounded-full p-0.5 cursor-pointer transition-colors ${hasBorder ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${hasBorder ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Cor da Borda</label>
                      <div className="grid grid-cols-10 gap-1">
                          {PAINT_COLORS.map(color => (
                              <button key={color} onClick={() => setBorderColor(color)} className={`aspect-square rounded-sm border ${borderColor === color ? 'ring-2 ring-blue-500 border-white scale-110' : 'border-slate-300 opacity-80 hover:opacity-100'}`} style={{ backgroundColor: color }} disabled={!hasBorder} />
                          ))}
                      </div>
                  </div>
                </div>

                 <div className="grid grid-cols-2 gap-2">
                   <button onClick={duplicateSelected} className="bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest shadow-lg hover:bg-black transition-all">👯 Duplicar</button>
                   <button onClick={removeSelected} className="bg-rose-50 text-rose-600 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border border-rose-100 hover:bg-rose-100 transition-all">Excluir</button>
                 </div>
              </div>
            )}

            <button 
                onClick={handleRemoveBackground}
                disabled={selectedIds.length === 0 || isProcessingIA}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {isProcessingIA ? '⌛ Processando...' : '✨ Remover Fundo IA'}
            </button>
          </div>

          <button onClick={() => window.print()} disabled={photos.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-blue-700 transition-all disabled:opacity-30 flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir ({pages.length} fls)
          </button>
        </div>
      </div>

      {/* ÁREA DE PREVIEW */}
      <div className="lg:col-span-8 flex flex-col gap-4 no-print relative h-full overflow-y-auto custom-scrollbar pb-10">
        <div className="flex-1 flex flex-col items-center gap-10 pt-4">
          <div className="sticky top-0 z-30 w-full flex justify-center pointer-events-none">
             <div className="bg-slate-900/80 backdrop-blur text-white px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl border border-white/10 pointer-events-auto flex items-center gap-4 mb-4">
                <span>Arraste a foto para enquadrar</span>
                {photos.length > 0 && (
                  <button onClick={toggleSelectAll} className={`px-3 py-1 rounded-lg border transition-all ${selectedIds.length === photos.length ? 'bg-blue-600 border-blue-600' : 'bg-white/10 border-white/20'}`}>
                    {selectedIds.length === photos.length ? 'DESELECIONAR' : 'SELECIONAR TODAS'}
                  </button>
                )}
             </div>
          </div>

          {pages.map((page, pageIndex) => (
            <div key={pageIndex} className="flex flex-col items-center gap-4">
              <div className="flex justify-between items-center w-full px-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {pageIndex + 1} / {pages.length}</span>
                <button onClick={() => saveAsPNG(pageIndex)} className="text-indigo-600 font-black text-[9px] uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-all">Baixar PNG</button>
              </div>
              <div 
                style={{ width: orientation === 'portrait' ? '462px' : '653px', minHeight: orientation === 'portrait' ? '653px' : '462px', backgroundColor: 'white', padding: '17.6px', display: 'flex', flexWrap: 'wrap', gap: `${gapMm * mmToPxPreview}px`, justifyContent: 'flex-start', alignContent: 'flex-start', flexShrink: 0 }} 
                className="shadow-2xl relative transition-all duration-500 border border-slate-100 checkerboard"
              >
                {page.map(photo => renderPhotoContent(photo, false))}
              </div>
            </div>
          ))}

          {photos.length === 0 && (
             <div className="flex flex-col items-center justify-center h-[500px] text-slate-300 opacity-20 italic font-black uppercase tracking-[0.3em]">
                Aguardando Fotos...
             </div>
          )}
        </div>
      </div>

      <div className="hidden print-area">
        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className="print-page">
            {page.map(photo => renderPhotoContent(photo, true))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoA4Generator;
