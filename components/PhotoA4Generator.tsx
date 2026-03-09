
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { removeBackgroundAI } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

interface PhotoItem {
  id: string;
  src: string;
  zoom: number;
  rotation: number;
  posX: number;
  posY: number;
  widthMm: number;
  heightMm: number;
  brightness: number;
  contrast: number;
  scaleX: number;
  scaleY: number;
}

const POLAROID_SIDE_MARGIN_RATIO = 0.10;
const POLAROID_TOP_MARGIN_RATIO = 0.10;
const POLAROID_BOTTOM_MARGIN_RATIO = 0.17;
const POLAROID_HEIGHT_RATIO = 1.25;

const PhotoA4Generator: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPolaroid, setIsPolaroid] = useState(false);
  const [gapMm, setGapMm] = useState(0);
  const [pageSize] = useState({ name: 'A4', w: 210, h: 297 });

  const [hasBorder, setHasBorder] = useState(true);
  const [borderColor, setBorderColor] = useState('#334155');
  const [borderWidthMm, setBorderWidthMm] = useState(0.5);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialPosX: 0, initialPosY: 0 });
  const [isProcessingIA, setIsProcessingIA] = useState(false);

  // Resize state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, initialScaleX: 1, initialScaleY: 1 });
  const [showResizeHandles, setShowResizeHandles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstSelected = photos.find(p => selectedIds.includes(p.id));

  const mmToPxPreview = 2.8; // Escala visual constante (representa A4 proporcionalmente)

  // Dimensões do preview A4 proporcional
  const previewWidth = (orientation === 'portrait' ? pageSize.w : pageSize.h) * mmToPxPreview;
  const previewHeight = (orientation === 'portrait' ? pageSize.h : pageSize.w) * mmToPxPreview;
  const previewPadding = 8 * mmToPxPreview; // 8mm de margem

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

  const processPdfFile = async (file: File) => {
    setIsProcessingIA(true);
    try {
      const data = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;

      const newPhotos: PhotoItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const src = canvas.toDataURL('image/jpeg', 0.9);
          newPhotos.push({
            id: Math.random().toString(36).substr(2, 9),
            src,
            zoom: 1.0,
            rotation: 0,
            posX: 0,
            posY: 0,
            widthMm: 80,
            heightMm: 100,
            brightness: 100,
            contrast: 100,
            scaleX: 1.0,
            scaleY: 1.0
          });
        }
      }
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      alert("Erro ao processar o arquivo PDF.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        if (file.type === 'application/pdf') {
          processPdfFile(file);
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
                heightMm: 100,
                brightness: 100,
                contrast: 100,
                scaleX: 1.0,
                scaleY: 1.0
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
          const currentSrc: string = updatedPhotos[i].src;
          const result = await removeBackgroundAI(currentSrc);
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
        posY: 0,
        rotation: 0,
        scaleX: 1.0,
        scaleY: 1.0
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

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, photo: PhotoItem, direction: 'horizontal' | 'vertical') => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    setResizingId(photo.id);
    setResizeDirection(direction);
    setResizeStart({
      x: clientX,
      y: clientY,
      initialScaleX: photo.scaleX || 1,
      initialScaleY: photo.scaleY || 1
    });
  };

  const handleResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!resizingId || !resizeDirection) return;
    const clientX = (e instanceof MouseEvent) ? e.clientX : (e as TouchEvent).touches[0].clientX;
    const clientY = (e instanceof MouseEvent) ? e.clientY : (e as TouchEvent).touches[0].clientY;

    const sensitivity = 0.005; // Sensibilidade do redimensionamento

    if (resizeDirection === 'horizontal') {
      const deltaX = clientX - resizeStart.x;
      const newScaleX = Math.max(0.1, Math.min(3, resizeStart.initialScaleX + (deltaX * sensitivity)));
      setPhotos(prev => prev.map(p => p.id === resizingId ? { ...p, scaleX: newScaleX } : p));
    } else {
      const deltaY = clientY - resizeStart.y;
      const newScaleY = Math.max(0.1, Math.min(3, resizeStart.initialScaleY + (deltaY * sensitivity)));
      setPhotos(prev => prev.map(p => p.id === resizingId ? { ...p, scaleY: newScaleY } : p));
    }
  };

  const handleResizeEnd = () => {
    setResizingId(null);
    setResizeDirection(null);
  };

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

  useEffect(() => {
    if (resizingId) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResizeMove);
      window.addEventListener('touchend', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);
    };
  }, [resizingId, resizeStart, resizeDirection]);

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

      const centerX = clipX + (clipW / 2); const centerY = clipY + (clipH / 2);
      ctx.translate(centerX + (photo.posX * (dpiFactor / mmToPxPreview)), centerY + (photo.posY * (dpiFactor / mmToPxPreview)));
      ctx.rotate((photo.rotation * Math.PI) / 180);
      ctx.scale(photo.zoom * (photo.scaleX || 1), photo.zoom * (photo.scaleY || 1));

      // Apply filters
      if (ctx.filter) {
        ctx.filter = `brightness(${photo.brightness || 100}%) contrast(${photo.contrast || 100}%)`;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Reset filter
      if (ctx.filter) {
        ctx.filter = 'none';
      }

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
    const isSelected = !isPrint && selectedIds.includes(photo.id);

    return (
      <div key={photo.id}
        onMouseDown={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        style={{ width: `${width}${unit}`, height: `${height}${unit}`, position: 'relative', border: isPolaroid ? `${0.4 * factor}${unit} solid #cbd5e1` : (hasBorder ? `${borderWidthMm * factor}${unit} solid ${borderColor}` : 'none'), boxSizing: 'border-box', overflow: 'visible', backgroundColor: isPolaroid ? 'white' : '#ffffff', boxShadow: isPolaroid && !isPrint ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}
        className={`transition-all cursor-move select-none ${isSelected ? 'ring-4 ring-blue-500 ring-inset z-20 shadow-2xl scale-[1.02]' : ''}`}>

        {/* Resize handles - only show when selected, resize mode active and not printing */}
        {isSelected && showResizeHandles && (
          <>
            {/* Horizontal resize handle - RIGHT */}
            <div
              onMouseDown={(e) => handleResizeStart(e, photo, 'horizontal')}
              onTouchStart={(e) => handleResizeStart(e, photo, 'horizontal')}
              className="absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-10 bg-rose-500 hover:bg-rose-600 rounded cursor-ew-resize z-30 flex items-center justify-center shadow-lg transition-colors"
              title="Arrastar para redimensionar horizontalmente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            {/* Horizontal resize handle - LEFT */}
            <div
              onMouseDown={(e) => handleResizeStart(e, photo, 'horizontal')}
              onTouchStart={(e) => handleResizeStart(e, photo, 'horizontal')}
              className="absolute top-1/2 -left-3 -translate-y-1/2 w-5 h-10 bg-rose-500 hover:bg-rose-600 rounded cursor-ew-resize z-30 flex items-center justify-center shadow-lg transition-colors"
              title="Arrastar para redimensionar horizontalmente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            {/* Vertical resize handle - BOTTOM */}
            <div
              onMouseDown={(e) => handleResizeStart(e, photo, 'vertical')}
              onTouchStart={(e) => handleResizeStart(e, photo, 'vertical')}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 w-10 bg-emerald-500 hover:bg-emerald-600 rounded cursor-ns-resize z-30 flex items-center justify-center shadow-lg transition-colors"
              title="Arrastar para redimensionar verticalmente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            {/* Vertical resize handle - TOP */}
            <div
              onMouseDown={(e) => handleResizeStart(e, photo, 'vertical')}
              onTouchStart={(e) => handleResizeStart(e, photo, 'vertical')}
              className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-10 bg-emerald-500 hover:bg-emerald-600 rounded cursor-ns-resize z-30 flex items-center justify-center shadow-lg transition-colors"
              title="Arrastar para redimensionar verticalmente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </>
        )}

        <div className="w-full h-full relative overflow-hidden" style={{ padding: isPolaroid ? `${width * POLAROID_TOP_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit} ${height * POLAROID_BOTTOM_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit}` : '0' }}>
          <div className="w-full h-full relative overflow-hidden bg-slate-50" style={{ border: isPolaroid ? `${0.4 * factor}${unit} solid #94a3b8` : 'none', boxSizing: 'border-box' }}>
            <img
              src={photo.src}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translate(${photo.posX}px, ${photo.posY}px) rotate(${photo.rotation}deg) scale(${photo.zoom * (photo.scaleX || 1)}, ${photo.zoom * (photo.scaleY || 1)})`,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                filter: `brightness(${photo.brightness || 100}%) contrast(${photo.contrast || 100}%)`
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in no-select h-full">
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'portrait' ? pageSize.w : pageSize.h}mm ${orientation === 'portrait' ? pageSize.h : pageSize.w}mm;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .print-page { 
            width: ${orientation === 'portrait' ? pageSize.w : pageSize.h}mm !important; 
            height: ${orientation === 'portrait' ? pageSize.h : pageSize.w}mm !important; 
            display: flex !important; 
            flex-wrap: wrap !important; 
            gap: ${gapMm}mm !important; 
            justify-content: flex-start !important; 
            align-content: flex-start !important; 
            padding: 8mm !important; 
            box-sizing: border-box !important; 
            page-break-after: always !important; 
            page-break-inside: avoid !important;
            break-after: page !important;
            margin: 0 auto !important;
            background: white !important;
            position: relative !important;
          }
          .print-page > div {
            flex-shrink: 0 !important;
          }
          .no-print {
            display: none !important;
          }
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
              Adicionar Fotos / PDF
              <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf, .png, .jpg, .jpeg, .gif, .webp, .tiff, .svg, image/*, application/pdf" onChange={handleFileUpload} />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-slate-100 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest border border-slate-200 hover:bg-slate-200 transition-colors">
                {orientation === 'portrait' ? '📄 Retrato' : '📂 Paisagem'}
              </button>
              <button onClick={() => setIsPolaroid(!isPolaroid)} className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${isPolaroid ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-900 border-slate-200'}`}>
                📸 Polaroid
              </button>
            </div>

            {/* Largura/Altura tool moved here */}
            <div className="p-4 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm mt-3">
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

              {/* Duplicar / Excluir */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Duplicar
                </button>
                <button onClick={removeSelected} disabled={selectedIds.length === 0} className="flex items-center justify-center gap-2 bg-red-50 text-red-500 py-3 px-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors disabled:opacity-30">
                  Excluir
                </button>
              </div>

              {/* Color Picker Tool moved here */}
              <div className="pt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Contorno (Borda)</label>
                  <div className="flex items-center gap-3">
                    <div onClick={() => setHasBorder(!hasBorder)} className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors flex-shrink-0 ${hasBorder ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow ${hasBorder ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} disabled={!hasBorder} className="w-10 h-10 p-0.5 border border-slate-200 rounded-lg cursor-pointer disabled:opacity-30" />
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{borderColor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={borderWidthMm} onChange={(e) => setBorderWidthMm(Number(e.target.value))} disabled={!hasBorder} className="w-14 h-10 text-center text-xs font-black border border-slate-200 rounded-lg disabled:opacity-30" min="0" max="20" step="0.5" />
                      <span className="text-[9px] font-black text-slate-400">MM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ÁREA DE EDIÇÃO DINÂMICA */}
          <div className="space-y-3">
            {/* Linha 1: Zoom e Espaçamento */}
            <div className="grid grid-cols-2 gap-3">
              {/* ZOOM */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
                    Zoom Máximo 10x {selectedIds.length > 0 ? `(${selectedIds.length})` : '(Preview)'}
                  </label>
                  <button
                    onClick={applyAutoCrop}
                    disabled={selectedIds.length === 0}
                    className="text-[7px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-tight disabled:opacity-30"
                  >
                    ✂️ Reset
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updatePhotos({ zoom: Math.max(0.1, (firstSelected?.zoom || 1) - 0.1) })}
                    disabled={selectedIds.length === 0}
                    className="p-1 bg-white border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div
                    className="bg-white border border-indigo-200 px-2 py-1 rounded font-black text-xs text-indigo-700 min-w-[55px] text-center cursor-ns-resize select-none"
                    onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ zoom: Math.max(0.1, Math.min(10, (firstSelected?.zoom || 1) + (e.deltaY < 0 ? 0.1 : -0.1))) }); }}
                    title="Scroll para ajustar"
                  >
                    {(firstSelected?.zoom || 1).toFixed(2)}x
                  </div>
                  <button
                    onClick={() => updatePhotos({ zoom: Math.min(10, (firstSelected?.zoom || 1) + 0.1) })}
                    disabled={selectedIds.length === 0}
                    className="p-1 bg-white border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* ESPAÇAMENTO */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Espaçamento Entre Fotos</label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setGapMm(Math.max(0, gapMm - 1))}
                    className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div
                    className="bg-white border border-slate-200 px-2 py-1 rounded font-black text-xs text-slate-700 min-w-[55px] text-center cursor-ns-resize select-none"
                    onWheel={(e) => { e.preventDefault(); setGapMm(Math.max(0, Math.min(50, gapMm + (e.deltaY < 0 ? 1 : -1)))); }}
                    title="Scroll para ajustar"
                  >
                    {gapMm}mm
                  </div>
                  <button
                    onClick={() => setGapMm(Math.min(50, gapMm + 1))}
                    className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: Ajustes de Imagem e Ferramenta de Girar */}
            <div className="grid grid-cols-2 gap-3">
              {/* AJUSTES DE IMAGEM */}
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                <label className="text-[8px] font-black text-amber-700 uppercase tracking-widest block">Ajustes de Imagem</label>

                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-amber-600 uppercase">Brilho</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updatePhotos({ brightness: Math.max(0, (firstSelected?.brightness || 100) - 1) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-amber-200 rounded text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div
                      className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-black text-[10px] text-amber-700 min-w-[45px] text-center cursor-ns-resize select-none"
                      onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ brightness: Math.max(0, Math.min(200, (firstSelected?.brightness || 100) + (e.deltaY < 0 ? 1 : -1))) }); }}
                      title="Scroll para ajustar"
                    >
                      {firstSelected?.brightness || 100}%
                    </div>
                    <button
                      onClick={() => updatePhotos({ brightness: Math.min(200, (firstSelected?.brightness || 100) + 1) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-amber-200 rounded text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-amber-600 uppercase">Contraste</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updatePhotos({ contrast: Math.max(0, (firstSelected?.contrast || 100) - 1) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-amber-200 rounded text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div
                      className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-black text-[10px] text-amber-700 min-w-[45px] text-center cursor-ns-resize select-none"
                      onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ contrast: Math.max(0, Math.min(200, (firstSelected?.contrast || 100) + (e.deltaY < 0 ? 1 : -1))) }); }}
                      title="Scroll para ajustar"
                    >
                      {firstSelected?.contrast || 100}%
                    </div>
                    <button
                      onClick={() => updatePhotos({ contrast: Math.min(200, (firstSelected?.contrast || 100) + 1) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-amber-200 rounded text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* FERRAMENTA DE GIRAR */}
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Ferramenta de Girar</label>
                  <div className="flex gap-1">
                    <button onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) - 90 })} disabled={selectedIds.length === 0} className="p-0.5 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) + 90 })} disabled={selectedIds.length === 0} className="p-0.5 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) - 1 })}
                    disabled={selectedIds.length === 0}
                    className="p-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div
                    className="bg-white border border-emerald-200 px-2 py-1 rounded font-black text-xs text-emerald-700 min-w-[55px] text-center cursor-ns-resize select-none"
                    onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ rotation: (firstSelected?.rotation || 0) + (e.deltaY < 0 ? 1 : -1) }); }}
                    title="Scroll para ajustar"
                  >
                    {firstSelected?.rotation || 0}°
                  </div>
                  <button
                    onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) + 1 })}
                    disabled={selectedIds.length === 0}
                    className="p-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 3: Redimensionar (largura total) */}
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black text-rose-700 uppercase tracking-widest">Redimensionar (Livre)</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowResizeHandles(!showResizeHandles)}
                    className={`text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tight transition-colors ${showResizeHandles
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-rose-600 border border-rose-300'
                      }`}
                  >
                    {showResizeHandles ? '✅ Alças ON' : '🔲 Alças'}
                  </button>
                  <button
                    onClick={() => updatePhotos({ scaleX: 1.0, scaleY: 1.0 })}
                    disabled={selectedIds.length === 0}
                    className="text-[7px] font-black text-white bg-rose-600 px-2 py-0.5 rounded uppercase tracking-tight disabled:opacity-30"
                  >
                    ↩️ Reset
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-rose-600 uppercase">Escala X (Largura)</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updatePhotos({ scaleX: Math.max(0.1, (firstSelected?.scaleX || 1) - 0.05) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-rose-200 rounded text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div
                      className="bg-white border border-rose-200 px-1.5 py-0.5 rounded font-black text-[10px] text-rose-700 min-w-[45px] text-center cursor-ns-resize select-none"
                      onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ scaleX: Math.max(0.1, Math.min(3, (firstSelected?.scaleX || 1) + (e.deltaY < 0 ? 0.05 : -0.05))) }); }}
                      title="Scroll para ajustar"
                    >
                      {(firstSelected?.scaleX || 1).toFixed(2)}x
                    </div>
                    <button
                      onClick={() => updatePhotos({ scaleX: Math.min(3, (firstSelected?.scaleX || 1) + 0.05) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-rose-200 rounded text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-rose-600 uppercase">Escala Y (Altura)</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updatePhotos({ scaleY: Math.max(0.1, (firstSelected?.scaleY || 1) - 0.05) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-rose-200 rounded text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 15l-7-7-7 7" /></svg>
                    </button>
                    <div
                      className="bg-white border border-rose-200 px-1.5 py-0.5 rounded font-black text-[10px] text-rose-700 min-w-[45px] text-center cursor-ns-resize select-none"
                      onWheel={(e) => { e.preventDefault(); if (selectedIds.length > 0) updatePhotos({ scaleY: Math.max(0.1, Math.min(3, (firstSelected?.scaleY || 1) + (e.deltaY < 0 ? 0.05 : -0.05))) }); }}
                      title="Scroll para ajustar"
                    >
                      {(firstSelected?.scaleY || 1).toFixed(2)}x
                    </div>
                    <button
                      onClick={() => updatePhotos({ scaleY: Math.min(3, (firstSelected?.scaleY || 1) + 0.05) })}
                      disabled={selectedIds.length === 0}
                      className="p-0.5 bg-white border border-rose-200 rounded text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 9l7 7 7-7" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[6px] text-rose-400 italic">💡 Estique livremente sem manter proporção</p>
            </div>

            {/* Linha 4: Mover Posição (X e Y) */}
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black text-sky-700 uppercase tracking-widest">Mover (X / Y)</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => updatePhotos({ posX: 0, posY: 0 })}
                    disabled={selectedIds.length === 0}
                    className="text-[7px] font-black text-white bg-sky-600 px-2 py-0.5 rounded uppercase tracking-tight disabled:opacity-30 hover:bg-sky-700 transition"
                  >
                    ↩️ Centro
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[7px] font-black uppercase text-sky-600">
                    <span>Eixo X (Horiz.)</span>
                    <span>{Math.round(firstSelected?.posX || 0)}px</span>
                  </div>
                  <input
                    type="range" min="-500" max="500" step="1"
                    value={firstSelected?.posX || 0}
                    onChange={(e) => updatePhotos({ posX: Number(e.target.value) })}
                    disabled={selectedIds.length === 0}
                    className="w-full accent-sky-500 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[7px] font-black uppercase text-sky-600">
                    <span>Eixo Y (Vert.)</span>
                    <span>{Math.round(firstSelected?.posY || 0)}px</span>
                  </div>
                  <input
                    type="range" min="-500" max="500" step="1"
                    value={firstSelected?.posY || 0}
                    onChange={(e) => updatePhotos({ posY: Number(e.target.value) })}
                    disabled={selectedIds.length === 0}
                    className="w-full accent-sky-500 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <button onClick={() => updatePhotos({ posY: (firstSelected?.posY || 0) - 1 })} disabled={selectedIds.length === 0} className="w-6 h-6 flex items-center justify-center bg-white border border-sky-200 rounded shadow-sm text-sky-600 hover:bg-sky-50 active:scale-90 disabled:opacity-30" title="Subir (1px)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <div />
                  <button onClick={() => updatePhotos({ posX: (firstSelected?.posX || 0) - 1 })} disabled={selectedIds.length === 0} className="w-6 h-6 flex items-center justify-center bg-white border border-sky-200 rounded shadow-sm text-sky-600 hover:bg-sky-50 active:scale-90 disabled:opacity-30" title="Esquerda (1px)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </button>
                  <div className="w-6 h-6 flex items-center justify-center bg-sky-100 rounded text-[7px] font-black text-sky-600">1px</div>
                  <button onClick={() => updatePhotos({ posX: (firstSelected?.posX || 0) + 1 })} disabled={selectedIds.length === 0} className="w-6 h-6 flex items-center justify-center bg-white border border-sky-200 rounded shadow-sm text-sky-600 hover:bg-sky-50 active:scale-90 disabled:opacity-30" title="Direita (1px)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                  </button>
                  <div />
                  <button onClick={() => updatePhotos({ posY: (firstSelected?.posY || 0) + 1 })} disabled={selectedIds.length === 0} className="w-6 h-6 flex items-center justify-center bg-white border border-sky-200 rounded shadow-sm text-sky-600 hover:bg-sky-50 active:scale-90 disabled:opacity-30" title="Descer (1px)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <div />
                </div>
              </div>
            </div>

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
              <span>Arraste e gire para enquadrar</span>
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
                style={{
                  width: `${previewWidth}px`,
                  minHeight: `${previewHeight}px`,
                  backgroundColor: 'white',
                  padding: `${previewPadding}px`,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${gapMm * mmToPxPreview}px`,
                  justifyContent: 'flex-start',
                  alignContent: 'flex-start',
                  flexShrink: 0
                }}
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

      <div className="print-only">
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
