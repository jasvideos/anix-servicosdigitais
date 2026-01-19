
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundAI } from '../services/geminiService';

const PhotoGenerator: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [zoom, setZoom] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Proporção 3x4 fixa para a Safe Zone (280px largura -> 373.33px altura)
  const FRAME_WIDTH = 280;
  const FRAME_HEIGHT = (FRAME_WIDTH * 4) / 3;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
      });
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
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        const captured = canvas.toDataURL('image/jpeg', 0.95);
        setRawImage(captured);
        setZoom(1.0);
        setPosition({ x: 0, y: 0 });
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
        setZoom(1.0);
        setPosition({ x: 0, y: 0 });
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
      if (result) setImage(result);
    } catch (err) {
      alert("Falha ao remover fundo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleEnd = () => setIsDragging(false);

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
        
        const canvasScale = canvas.width / FRAME_WIDTH;
        const baseWidthInPreview = FRAME_WIDTH;
        const baseHeightInPreview = (img.height * FRAME_WIDTH) / img.width;

        const finalW = baseWidthInPreview * zoom * canvasScale;
        const finalH = baseHeightInPreview * zoom * canvasScale;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.translate(position.x * canvasScale, position.y * canvasScale);
        ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH);
        ctx.restore();

        setImage(canvas.toDataURL('image/jpeg', 0.98));
        setIsCropping(false);
      }
    };
    img.src = rawImage;
  };

  const handleRealignment = () => {
    if (rawImage) {
      setIsCropping(true);
      setImage(null);
    }
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
    const mmToPx = 11.811; 
    canvas.width = 105 * mmToPx; 
    canvas.height = 148 * mmToPx; 
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      const pW = 30 * mmToPx; 
      const pH = 40 * mmToPx; 
      const gap = 0.01 * mmToPx;
      
      const sX = (canvas.width - (3 * pW + 2 * gap)) / 2;
      const sY = (canvas.height - (3 * pH + 2 * gap)) / 2;
      
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = sX + c * (pW + gap);
          const y = sY + r * (pH + gap);
          ctx.drawImage(img, x, y, pW, pH);
          ctx.strokeStyle = '#F3F3F3';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, pW, pH);
        }
      }
      const link = document.createElement('a');
      link.download = `anix-3x4-grade.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = image;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in no-select">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .photo-print-area, .photo-print-area * { visibility: visible; }
          .photo-print-area {
            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
            width: 105mm; height: 148mm; background: white;
            display: grid !important; 
            grid-template-columns: repeat(3, 30mm); 
            gap: 0.01mm;
            justify-content: center; align-content: center;
          }
          .photo-item { width: 30mm; height: 40mm; overflow: hidden; border: 0.01mm solid #eee; }
          .photo-item img { width: 100%; height: 100%; object-fit: contain; }
        }
        .no-select { user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
        .crop-container { touch-action: none; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .mask-safe-zone {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .frame-3x4 {
          width: ${FRAME_WIDTH}px;
          height: ${FRAME_HEIGHT}px;
          border: 2px solid #6366f1;
          box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.7);
          position: relative;
        }
        .frame-3x4::before {
          content: "";
          position: absolute;
          top: 15%; left: 50%; transform: translateX(-50%);
          width: 50%; height: 50%;
          border: 1px dashed rgba(255,255,255,0.3);
          border-radius: 50% 50% 45% 45%;
        }
      `}</style>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10 no-print">
        <div className="flex justify-between items-center mb-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Fotos 3x4 Profissionais</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ajuste e Recorte com Máscara Safe Zone</p>
          </div>
          {isProcessing && <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest animate-pulse italic">IA Ativa</div>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="relative flex flex-col h-[520px] bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800">
              {showCamera ? (
                <div className="relative h-full w-full flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover scale-x-[-1]" />
                  <div className="mask-safe-zone">
                    <div className="frame-3x4"></div>
                  </div>
                  <div className="absolute bottom-8 inset-x-0 flex justify-center z-30">
                    <button onClick={capturePhoto} className="bg-white w-20 h-20 rounded-full border-4 border-slate-300 shadow-2xl active:scale-90 transition-all"></button>
                  </div>
                </div>
              ) : isCropping && rawImage ? (
                <div className="h-full flex flex-col bg-slate-900">
                  <div 
                    className="relative crop-container cursor-move"
                    onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                    onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleEnd}
                  >
                    <img 
                      src={rawImage} className="max-w-none absolute pointer-events-none" 
                      style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        transformOrigin: 'center center',
                        width: '100%'
                      }} 
                    />
                    <div className="mask-safe-zone">
                      <div className="frame-3x4">
                         <div className="absolute top-1/2 left-0 right-0 border-t border-white/10"></div>
                         <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/10"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-950 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Zoom</span>
                      <input type="range" min="0.5" max="5" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-indigo-500 h-2 rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setIsCropping(false); setRawImage(null); }} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest">Descartar</button>
                      <button onClick={applyCrop} className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95">Gerar Foto</button>
                    </div>
                  </div>
                </div>
              ) : image ? (
                <div className="h-full w-full bg-white flex items-center justify-center p-8 relative">
                   <img src={image} className="max-h-full max-w-full shadow-2xl border border-slate-100" alt="Final" />
                   <div className="absolute top-4 right-4 flex gap-2">
                     <button onClick={handleRealignment} title="Realinhar Foto" className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-transform flex items-center gap-2 px-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                        <span className="text-[10px] font-black uppercase">Ajustar</span>
                     </button>
                     <button onClick={() => { setImage(null); setRawImage(null); }} title="Excluir" className="bg-rose-600 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                     </button>
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-slate-950">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">Inicie a câmera ou escolha um arquivo para editar</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={startCamera} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">Iniciar Câmera</button>
              <label className="bg-white border-2 border-slate-200 text-slate-800 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer text-center hover:bg-slate-50 transition-all">
                Abrir Arquivo
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
            {image && !isCropping && (
              <button onClick={handleRemoveBackground} disabled={isProcessing} className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Remover Fundo IA
              </button>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-900 rounded-[2.5rem] p-10 flex flex-col shadow-2xl min-h-[500px] border border-slate-800">
             <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-10">Grade para Impressão (0.01mm)</h3>
             {image ? (
               <div className="flex-1 flex flex-col gap-10">
                 <div className="bg-white p-6 rounded-3xl shadow-inner mx-auto border-8 border-slate-800/50 overflow-hidden">
                    <div className="grid grid-cols-3 bg-white p-1 border border-slate-100" style={{ gap: '0.01mm' }}>
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="w-[18mm] h-[24mm] bg-white overflow-hidden border border-slate-50 flex items-center justify-center"><img src={image} className="w-full h-full object-contain" /></div>
                      ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={handlePrint} className="bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-700 shadow-xl">Imprimir Grade</button>
                    <button onClick={saveAsPNG} className="bg-white text-slate-900 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all">Salvar PNG</button>
                 </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] text-center text-white/10 p-12 gap-4">
                  <p className="uppercase font-black text-[10px] tracking-[0.3em]">Aguardando Geração</p>
                  <div className="w-48 h-px bg-white/5"></div>
                  <p className="text-[8px] max-w-[200px] opacity-40 italic">O enquadramento correto garante uma foto 3x4 oficial para documentos.</p>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="hidden photo-print-area">
        {image && Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="photo-item"><img src={image} alt="print" /></div>
        ))}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoGenerator;
