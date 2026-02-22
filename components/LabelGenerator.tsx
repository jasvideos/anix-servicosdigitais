
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundAI } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const LabelGenerator: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [shape, setShape] = useState<'rect' | 'circle'>('rect');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(30);
  const [marginMm, setMarginMm] = useState(2);

  const [hasBorder, setHasBorder] = useState(false);
  const [borderWidth, setBorderWidth] = useState(0.2); 
  const [borderColor, setBorderColor] = useState('#000000');
  
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (shape === 'circle' && widthMm !== heightMm) {
      setHeightMm(widthMm);
    }
  }, [shape, widthMm]);

  const processPdfFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // Pega apenas a primeira página como arte da etiqueta
      
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
        const src = canvas.toDataURL('image/png');
        setRawImage(src);
        setImage(src);
        setIsCropping(true);
      }
    } catch (err) {
      console.error("Erro no PDF:", err);
      alert("Erro ao ler o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        processPdfFile(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRawImage(reader.result as string);
          setImage(reader.result as string);
          setIsCropping(true);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveBackground = async () => {
    if (!image) return;
    setIsProcessing(true);
    try {
      const base64 = image.split(',')[1];
      const result = await removeBackgroundAI(base64);
      if (result) {
        setImage(result);
        setRawImage(result);
      }
    } catch (err) {
      alert("Falha ao remover fundo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyCrop = () => {
    if (!canvasRef.current || !rawImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000 * (heightMm / widthMm);
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const containerW = 250; 
        const ratio = canvas.width / containerW;
        
        const drawW = img.width * zoom * (containerW / img.width) * ratio;
        const drawH = img.height * zoom * (containerW / img.width) * ratio;
        const drawX = position.x * ratio;
        const drawY = position.y * ratio;
        
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        setImage(canvas.toDataURL('image/png'));
        setIsCropping(false);
      }
    };
    img.src = rawImage;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCropping) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isCropping) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const saveAsPNG = () => {
    if (!image) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mmToPx = 11.811;
    const canvasW = orientation === 'portrait' ? 210 : 297;
    const canvasH = orientation === 'portrait' ? 297 : 210;
    
    canvas.width = canvasW * mmToPx;
    canvas.height = canvasH * mmToPx;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      const wPx = widthMm * mmToPx;
      const hPx = heightMm * mmToPx;
      const mPx = marginMm * mmToPx;
      
      const totalGridW = (cols * wPx) + ((cols - 1) * mPx);
      const totalGridH = (rows * hPx) + ((rows - 1) * mPx);
      const startX = (canvas.width - totalGridW) / 2;
      const startY = (canvas.height - totalGridH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (wPx + mPx);
          const y = startY + r * (hPx + mPx);

          // Calcular object-contain para manter proporções da imagem
          const imgAspect = img.width / img.height;
          const cellAspect = wPx / hPx;
          let drawW, drawH, drawX, drawY;
          
          if (imgAspect > cellAspect) {
            // Imagem mais larga - ajustar pela largura
            drawW = wPx;
            drawH = wPx / imgAspect;
            drawX = x;
            drawY = y + (hPx - drawH) / 2;
          } else {
            // Imagem mais alta - ajustar pela altura
            drawH = hPx;
            drawW = hPx * imgAspect;
            drawX = x + (wPx - drawW) / 2;
            drawY = y;
          }

          if (shape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + wPx/2, y + hPx/2, wPx/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
            
            // Borda do círculo depois do clip para não ser cortada
            if (hasBorder) {
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = borderWidth * mmToPx;
              ctx.beginPath();
              ctx.arc(x + wPx/2, y + hPx/2, wPx/2 - (borderWidth * mmToPx / 2), 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            if (hasBorder) {
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = borderWidth * mmToPx;
              ctx.strokeRect(x, y, wPx, hPx);
            }
          }
        }
      }

      const link = document.createElement('a');
      link.download = `etiquetas-anix-${orientation}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = image;
  };

  const pageW = orientation === 'portrait' ? 210 : 297;
  const pageH = orientation === 'portrait' ? 297 : 210;
  const safeAreaW = pageW - 8; 
  const safeAreaH = pageH - 8;
  
  const cols = Math.floor((safeAreaW + marginMm) / (widthMm + marginMm)) || 1;
  const rows = Math.floor((safeAreaH + marginMm) / (heightMm + marginMm)) || 1;
  const totalLabels = cols * rows;

  return (
    <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in print:p-0">
      <style>
        {`
          @media print {
            @page {
              size: A4 ${orientation};
              margin: 0;
            }
            .print-only {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: ${pageW}mm !important;
              height: ${pageH}mm !important;
              padding: 4mm 0 !important;
              display: grid !important;
              grid-template-columns: repeat(${cols}, ${widthMm}mm) !important;
              gap: ${marginMm}mm !important;
              justify-content: center !important;
              align-content: start !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              background: white !important;
            }
            .label-item {
              width: ${widthMm}mm !important;
              height: ${heightMm}mm !important;
              border: ${hasBorder ? `${borderWidth}mm solid ${borderColor}` : 'none'} !important;
              border-radius: ${shape === 'circle' ? '50%' : '0'} !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              flex-shrink: 0 !important;
            }
            .label-item img {
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
            }
          }
        `}
      </style>

      <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 no-print flex flex-col h-fit">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Configurações</h2>
          {isProcessing && <div className="animate-pulse text-indigo-600 text-[10px] font-black uppercase tracking-widest">IA Ativa...</div>}
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Arte / PDF</label>
            <div className="flex flex-col h-[520px] bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/20 shadow-2xl">
              {isCropping && rawImage ? (
                <>
                  <div className="flex-1 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                    <div className={`bg-white overflow-hidden relative border-2 border-indigo-500 shadow-2xl cursor-move ${shape === 'circle' ? 'rounded-full' : ''}`} style={{ width: '250px', height: `${250 * (heightMm / widthMm)}px` }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
                      <img src={rawImage} draggable={false} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transformOrigin: '0 0', maxWidth: 'none', width: '100%' }} className="pointer-events-none" />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 border-t border-white/5 z-20 shrink-0">
                    <div className="flex gap-2 mb-4">
                      <input type="number" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 bg-slate-800 text-white rounded px-2 py-2 text-[10px] font-bold border border-slate-700" placeholder="Zoom" />
                      <input type="number" value={position.x} onChange={(e) => setPosition(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1 bg-slate-800 text-white rounded px-2 py-2 text-[10px] font-bold border border-slate-700" placeholder="X" />
                      <input type="number" value={position.y} onChange={(e) => setPosition(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1 bg-slate-800 text-white rounded px-2 py-2 text-[10px] font-bold border border-slate-700" placeholder="Y" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsCropping(false)} className="flex-1 bg-slate-800 text-white text-[9px] py-3 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                      <button onClick={applyCrop} className="flex-[2] bg-indigo-600 text-white text-[9px] py-3 rounded-xl font-black uppercase tracking-widest active:scale-95">Aplicar Arte</button>
                    </div>
                  </div>
                </>
              ) : image ? (
                <div className="relative w-full h-full p-8 flex items-center justify-center bg-slate-100/30">
                  <img src={image} className={`max-w-full max-h-full object-contain shadow-2xl border-4 border-white ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`} alt="Label Preview" />
                  <button onClick={() => { setImage(null); setRawImage(null); }} className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full hover:scale-110 shadow-lg transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-800/50 transition-all bg-slate-900 group">
                  <div className="bg-indigo-600 p-5 rounded-2xl shadow-xl mb-4 group-hover:scale-105 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg></div>
                  <p className="text-white text-[10px] font-black uppercase tracking-widest text-center px-4">Carregar Arte ou PDF</p>
                  <input type="file" className="hidden" accept=".pdf, .png, .jpg, .jpeg, .gif, .webp, .tiff, .svg, image/*, application/pdf" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleRemoveBackground} disabled={!image || isProcessing} className="flex-1 bg-white text-rose-600 border border-rose-100 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 disabled:opacity-30">IA Fundo</button>
              <button onClick={() => setIsCropping(true)} disabled={!rawImage} className="flex-1 bg-white text-indigo-600 border border-indigo-100 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50">Ajustar Arte</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shape === 'circle' ? 'Diâmetro (mm)' : 'Largura (mm)'}</label>
              <input type="number" value={widthMm} onChange={(e) => setWidthMm(Math.max(1, Number(e.target.value)))} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (mm)</label>
              <input type="number" value={heightMm} disabled={shape === 'circle'} onChange={(e) => setHeightMm(Math.max(1, Number(e.target.value)))} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm disabled:opacity-30" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setShape('rect')}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] transition-all border uppercase tracking-widest ${shape === 'rect' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                Retangular
              </button>
              <button 
                onClick={() => setShape('circle')}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] transition-all border uppercase tracking-widest ${shape === 'circle' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                Circular
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orientação da Folha</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setOrientation('portrait')}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] transition-all border uppercase tracking-widest flex items-center justify-center gap-2 ${orientation === 'portrait' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Retrato
              </button>
              <button 
                onClick={() => setOrientation('landscape')}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] transition-all border uppercase tracking-widest flex items-center justify-center gap-2 ${orientation === 'landscape' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: 'rotate(90deg)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Paisagem
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espaçamento Entre Etiquetas (mm)</label>
              <input type="number" value={marginMm} onChange={(e) => setMarginMm(Math.max(0, Number(e.target.value)))} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
            </div>
            
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contorno da Etiqueta</label>
              <div className="flex items-center gap-3">
                <div onClick={() => setHasBorder(!hasBorder)} className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors flex-shrink-0 ${hasBorder ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow ${hasBorder ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} disabled={!hasBorder} className="w-10 h-10 p-0.5 border border-slate-200 rounded-lg cursor-pointer disabled:opacity-30" />
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{borderColor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} disabled={!hasBorder} className="w-14 h-10 text-center text-xs font-black border border-slate-200 rounded-lg disabled:opacity-30" min="0" max="10" step="0.1" />
                  <span className="text-[9px] font-black text-slate-400">MM</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="lg:col-span-8 space-y-6 flex flex-col h-full overflow-hidden no-print">
        <div className="flex items-center justify-between shrink-0 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Folha de Impressão</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{totalLabels} etiquetas / folha A4 ({orientation === 'portrait' ? 'Vertical' : 'Horizontal'})</p>
          </div>
          {image && (
            <div className="flex gap-3">
              <button 
                onClick={saveAsPNG} 
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 flex items-center gap-3 transition-all hover:-translate-y-1 uppercase tracking-widest text-[10px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG
              </button>
              <button 
                onClick={handlePrint} 
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black flex items-center gap-3 transition-all hover:-translate-y-1 uppercase tracking-widest text-[10px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                Imprimir
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-200 relative shadow-inner">
          <div className="absolute inset-0 overflow-auto p-12 flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-300">
            <div 
              className="relative bg-white shadow-2xl p-0 transition-all duration-500" 
              style={{ 
                width: `${pageW}mm`, 
                minHeight: `${pageH}mm`,
                transform: 'scale(0.8)',
                transformOrigin: 'top center'
              }}
            >
              <div 
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${widthMm}mm)`,
                  gap: `${marginMm}mm`,
                  justifyContent: 'center',
                  alignContent: 'start',
                  paddingTop: '8mm',
                  paddingBottom: '8mm',
                  width: '100%'
                }}
              >
                {image ? (
                  Array.from({ length: totalLabels }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-white flex items-center justify-center overflow-hidden"
                      style={{ 
                        width: `${widthMm}mm`, 
                        height: `${heightMm}mm`,
                        border: hasBorder ? `${borderWidth}mm solid ${borderColor}` : '0.1px solid #f1f5f9',
                        borderRadius: shape === 'circle' ? '50%' : '0'
                      }}
                    >
                      <img src={image} className="w-full h-full object-contain" alt="Label" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-200 opacity-20">
                    <span className="text-8xl font-black uppercase rotate-[-30deg]">A4 {orientation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-only">
        {image && Array.from({ length: totalLabels }).map((_, i) => (
          <div key={i} className="label-item">
            <img src={image} alt="Label Print" />
          </div>
        ))}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default LabelGenerator;
