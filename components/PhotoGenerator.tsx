
import React, { useState, useRef } from 'react';
import { removeBackgroundAI } from '../services/geminiService';

const PhotoGenerator: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [zoom, setZoom] = useState(1.5);
  const [position, setPosition] = useState({ x: -100, y: -50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      alert("Não foi possível acessar a câmera.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setRawImage(dataUrl);
        setImage(dataUrl);
        stopCamera();
        setIsCropping(true);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

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
      } else {
        alert("Não foi possível remover o fundo. Tente outra foto.");
      }
    } catch (err) {
      alert("Falha técnica ao processar imagem.");
    } finally {
      setIsProcessing(false);
    }
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

  const applyCrop = () => {
    if (!canvasRef.current || !rawImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 800;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const containerW = 280; 
        const ratio = canvas.width / containerW;
        const drawW = img.width * zoom * (containerW / img.width) * ratio;
        const drawH = img.height * zoom * (containerW / img.width) * ratio;
        const drawX = position.x * ratio;
        const drawY = position.y * ratio;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        setImage(canvas.toDataURL('image/jpeg', 0.95));
        setIsCropping(false);
      }
    };
    img.src = rawImage;
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const saveAsPNG = () => {
    if (!image) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuração para folha 10x15cm em 300 DPI
    // 105mm x 148mm (A6 aproximado)
    // 1mm = 11.811 pixels (300 DPI)
    const mmToPx = 11.811;
    canvas.width = 105 * mmToPx;
    canvas.height = 148 * mmToPx;

    // Fundo branco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      const photoWidth = 30 * mmToPx;
      const photoHeight = 40 * mmToPx;
      const gap = 1 * mmToPx;
      
      const totalWidth = (3 * photoWidth) + (2 * gap);
      const totalHeight = (3 * photoHeight) + (2 * gap);
      
      const startX = (canvas.width - totalWidth) / 2;
      const startY = (canvas.height - totalHeight) / 2;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = startX + col * (photoWidth + gap);
          const y = startY + row * (photoHeight + gap);
          ctx.drawImage(img, x, y, photoWidth, photoHeight);
          
          // Borda sutil opcional para guiar o corte
          ctx.strokeStyle = '#EEEEEE';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, photoWidth, photoHeight);
        }
      }

      const link = document.createElement('a');
      link.download = `grade-3x4-anix.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = image;
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-8 animate-fade-in">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .photo-print-area, .photo-print-area * { visibility: visible; }
            .photo-print-area {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 105mm;
              height: 148mm;
              background: white;
              display: grid !important;
              grid-template-columns: repeat(3, 30mm);
              gap: 0.1mm;
              justify-content: center;
              align-content: center;
            }
            .photo-item {
              width: 30mm;
              height: 40mm;
              overflow: hidden;
            }
            .photo-item img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          }
        `}
      </style>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Estúdio 3x4 Digital</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alinhamento profissional para documentos</p>
          </div>
          {isProcessing && <div className="animate-pulse text-indigo-600 font-black text-[10px] uppercase tracking-widest">IA Ativa...</div>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex flex-col h-[580px] bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-800">
              {showCamera ? (
                <div className="relative flex-1">
                  <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[60px] border-black/60 pointer-events-none flex items-center justify-center">
                    <div className="w-[240px] h-[320px] border-4 border-white/80 rounded-sm border-dashed"></div>
                  </div>
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <button onClick={capturePhoto} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black shadow-2xl uppercase text-[10px] tracking-widest border-4 border-slate-900 active:scale-95">Bater Foto</button>
                  </div>
                </div>
              ) : isCropping && rawImage ? (
                <>
                  <div className="flex-1 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                    <div className="w-[280px] h-[373px] bg-white overflow-hidden relative border-4 border-indigo-500 shadow-2xl cursor-move z-10" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
                      <img src={rawImage} draggable={false} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transformOrigin: '0 0', maxWidth: 'none', width: '100%' }} className="pointer-events-none" />
                    </div>
                  </div>
                  <div className="bg-slate-900 px-8 py-8 space-y-6 border-t border-white/5 shrink-0 z-20">
                     <div className="grid grid-cols-3 gap-4">
                       <input type="number" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 font-bold" />
                       <input type="number" value={position.x} onChange={(e) => setPosition(p => ({ ...p, x: Number(e.target.value) }))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 font-bold" />
                       <input type="number" value={position.y} onChange={(e) => setPosition(p => ({ ...p, y: Number(e.target.value) }))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 font-bold" />
                     </div>
                     <div className="flex gap-4">
                       <button onClick={() => setIsCropping(false)} className="flex-1 bg-slate-800 text-white text-[10px] py-4 rounded-2xl font-black uppercase tracking-widest">Cancelar</button>
                       <button onClick={applyCrop} className="flex-[2] bg-indigo-600 text-white text-[10px] py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95">Confirmar</button>
                     </div>
                  </div>
                </>
              ) : image ? (
                <div className="relative w-full h-full bg-slate-100 flex items-center justify-center p-12">
                  <img src={image} className="max-w-full max-h-full object-contain shadow-2xl border-[8px] border-white rounded-lg" alt="Preview" />
                  <button onClick={() => { setImage(null); setRawImage(null); }} className="absolute top-8 right-8 bg-rose-600 text-white p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 110 2l-4.293 4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                  <div className="bg-slate-800 p-8 rounded-full mb-6"><svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg></div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Selecione uma Imagem</h3>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {!isCropping && (
                  <>
                    <button onClick={startCamera} className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black">Câmera</button>
                    <label className="bg-white border-2 border-slate-200 text-slate-800 px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] text-center cursor-pointer shadow-sm hover:bg-slate-50">Upload<input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} /></label>
                  </>
                )}
              </div>
              {image && !isCropping && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleRemoveBackground} disabled={isProcessing} className="bg-rose-50 text-rose-600 border-2 border-rose-100 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-rose-100 disabled:opacity-50 transition-all">{isProcessing ? 'IA Fundo...' : 'IA Remover Fundo'}</button>
                  <button onClick={() => setIsCropping(true)} className="bg-white border-2 border-indigo-100 text-indigo-600 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-indigo-50 transition-all">Ajustar</button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6 no-print">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 flex flex-col h-full shadow-2xl relative overflow-hidden min-h-[650px]">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Prova de Impressão</h3>
                <div className="flex-1 flex flex-col space-y-8">
                  {image ? (
                    <>
                      <div className="bg-white rounded-[2.5rem] p-8 shadow-inner flex flex-col items-center justify-center flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Grade Fotográfica (10x15cm)</p>
                        <div className="grid grid-cols-3 bg-white p-2 border-2 border-slate-100 shadow-sm" style={{ gap: '0.1mm', justifyItems: 'center', justifyContent: 'center' }}>
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="bg-slate-50 overflow-hidden" style={{ width: '22mm', height: '30mm', border: '0.1px solid #f1f5f9' }}>
                              <img src={image} className="w-full h-full object-cover" alt={`3x4-${i}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handlePrint} className="flex-1 bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-indigo-700 active:scale-95">Imprimir Grade</button>
                        <button onClick={saveAsPNG} className="flex-1 bg-white text-slate-900 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Salvar PNG
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-700">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Prepare sua foto para visualizar a prova de impressão</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO REAL */}
      <div className="hidden photo-print-area">
        {image && Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="photo-item">
            <img src={image} alt="print" />
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoGenerator;
