
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundAI } from '../services/geminiService';

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
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

    // A4 300 DPI - Dinâmico pela orientação
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
      const startX = (canvas.width - totalGridW) / 2;
      const startY = 4 * mmToPx;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (wPx + mPx);
          const y = startY + r * (hPx + mPx);

          if (hasBorder) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth * mmToPx;
            if (shape === 'circle') {
              ctx.beginPath();
              ctx.arc(x + wPx/2, y + hPx/2, wPx/2, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, wPx, hPx);
            }
          }

          if (shape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + wPx/2, y + hPx/2, wPx/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, x, y, wPx, hPx);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, wPx, hPx);
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

  // Área Segura baseada na orientação
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
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: ${pageW}mm;
              height: ${pageH}mm;
              padding: 4mm 0;
              background: white;
              display: grid !important;
              grid-template-columns: repeat(${cols}, ${widthMm}mm);
              gap: ${marginMm}mm;
              justify-content: center;
              box-sizing: border-box;
              margin: 0;
            }
            .label-item {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              border: ${hasBorder ? `${borderWidth}mm solid ${borderColor}` : 'none'};
              border-radius: ${shape === 'circle' ? '50%' : '0'};
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .label-item img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            @page {
              size: A4 ${orientation};
              margin: 0;
            }
          }
        `}
      </style>

      {/* Coluna 1: Configurações */}
      <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 no-print flex flex-col h-fit">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Configurações</h2>
          {isProcessing && <div className="animate-pulse text-indigo-600 text-[10px] font-black uppercase tracking-widest">IA Ativa...</div>}
        </div>

        <div className="space-y-6">
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

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espaçamento Entre Etiquetas (mm)</label>
              <input type="number" value={marginMm} onChange={(e) => setMarginMm(Math.max(0, Number(e.target.value)))} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
            </div>
            
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest">
                <input type="checkbox" checked={hasBorder} onChange={(e) => setHasBorder(e.target.checked)} className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Contorno da Etiqueta
              </label>
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500"><span>Espessura (mm)</span><span>{borderWidth}</span></div>
                <input type="range" min="0" max="10" step="0.1" value={borderWidth} disabled={!hasBorder} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full accent-indigo-600 disabled:opacity-30" />
                <div className="flex gap-2">
                  <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} disabled={!hasBorder} className="w-12 h-10 p-1 border border-slate-200 rounded-lg bg-white cursor-pointer disabled:opacity-30 shadow-sm" />
                  <input type="number" step="0.1" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} disabled={!hasBorder} className="flex-1 border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-30" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Arte</label>
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
                  <p className="text-white text-[10px] font-black uppercase tracking-widest">Carregar Arte</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleRemoveBackground} disabled={!image || isProcessing} className="flex-1 bg-white text-rose-600 border border-rose-100 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 disabled:opacity-30">IA Fundo</button>
              <button onClick={() => setIsCropping(true)} disabled={!rawImage} className="flex-1 bg-white text-indigo-600 border border-indigo-100 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50">Ajustar Arte</button>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna 2: Folha de Impressão (Preview) */}
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

      {/* ÁREA DE IMPRESSÃO REAL */}
      <div className="hidden print-area">
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
