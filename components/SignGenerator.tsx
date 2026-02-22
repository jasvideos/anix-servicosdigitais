
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackgroundAI, generateSignImage } from '../services/geminiService';

type SignSize = 'A4' | 'A3';
type ContactIcon = 'none' | 'phone' | 'whatsapp';

interface ColorSelectorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const SimpleColorSelector: React.FC<ColorSelectorProps> = ({ label, value, onChange }) => (
  <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{label}</label>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 p-0.5 border border-slate-200 rounded-lg cursor-pointer" />
      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{value}</span>
    </div>
  </div>
);

// Helper para desenhar retângulo com cantos arredondados
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Helper para quebrar texto em múltiplas linhas
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

const SignGenerator: React.FC = () => {
  const [title, setTitle] = useState('AVISO');
  const [subtitle, setSubtitle] = useState('AMBIENTE MONITORADO');
  const [phone, setPhone] = useState('');
  const [contactIcon, setContactIcon] = useState<ContactIcon>('none');
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  
  const [size, setSize] = useState<SignSize>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  const [bgColor, setBgColor] = useState('#FFF200'); 
  const [headerBg, setHeaderBg] = useState('#1A1A1A'); 
  const [headerTextColor, setHeaderTextColor] = useState('#FFF200');
  const [footerBg, setFooterBg] = useState('#1A1A1A'); 
  const [footerTextColor, setFooterTextColor] = useState('#FFF200');
  const [bodyTextColor, setBodyTextColor] = useState('#000000');
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidth, setBorderWidth] = useState(30);

  const [titleFont, setTitleFont] = useState('Inter');
  const [subtitleFont, setSubtitleFont] = useState('Inter');
  const [phoneFont, setPhoneFont] = useState('Inter');

  const [titleFontSize, setTitleFontSize] = useState(12);
  const [subtitleFontSize, setSubtitleFontSize] = useState(10);
  const [phoneFontSize, setPhoneFontSize] = useState(6);
  const [headerHeight, setHeaderHeight] = useState(25);
  const [footerHeight, setFooterHeight] = useState(15);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [printImageSrc, setPrintImageSrc] = useState<string | null>(null);

  const FONT_FAMILIES = ['Inter', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Roboto', 'Montserrat', 'Oswald', 'Lato', 'Raleway'];

  interface FontSelectorProps {
    label: string;
    value: string;
    onChange: (font: string) => void;
  }
  
  const FontSelector: React.FC<FontSelectorProps> = ({ label, value, onChange }) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2 outline-none font-bold text-xs"
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );

  const handlePrint = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setPrintImageSrc(dataUrl);
      setTimeout(() => {
        window.focus();
        window.print();
      }, 100);
    }
  };

  const handleBodyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBodyImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSearchImageIA = async () => {
    if (!imageSearchQuery.trim()) return;
    setIsProcessingIA(true);
    try {
      const result = await generateSignImage(imageSearchQuery);
      if (result) {
        setBodyImage(result);
      } else {
        alert("Não foi possível encontrar ou gerar uma imagem para essa busca.");
      }
    } catch (err) {
      alert("Falha ao processar busca de imagem.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const handleRemoveBgIA = async () => {
    if (!bodyImage) return;
    setIsProcessingIA(true);
    try {
      const base64 = bodyImage.split(',')[1];
      const result = await removeBackgroundAI(base64);
      if (result) {
        setBodyImage(result);
      } else {
        alert("Não foi possível remover o fundo.");
      }
    } catch (err) {
      alert("Falha técnica ao remover fundo.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const saveAsPNG = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `placa-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Carregar imagem quando bodyImage mudar
  useEffect(() => {
    if (bodyImage) {
      const img = new Image();
      img.onload = () => setLoadedImage(img);
      img.src = bodyImage;
    } else {
      setLoadedImage(null);
    }
  }, [bodyImage]);

  // Função de renderização do canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isPortrait = orientation === 'portrait';
    const ratio = isPortrait ? 210 / 297 : 297 / 210;
    const width = 800;
    const height = width / ratio;

    canvas.width = width;
    canvas.height = height;

    const scaleFactor = width / 100;

    // Fundo
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Margens e dimensões
    const dist35 = (3.5 / 100) * width;
    const headerBoxH = height * (headerHeight / 100);
    const footerBoxH = phone ? height * (footerHeight / 100) : 0;
    const headerBoxW = width - (dist35 * 2);

    // Header Box
    ctx.fillStyle = headerBg;
    roundRect(ctx, dist35, dist35, headerBoxW, headerBoxH, 20);
    ctx.fill();

    // Title
    if (title) {
      ctx.fillStyle = headerTextColor;
      ctx.font = `900 ${titleFontSize * scaleFactor}px ${titleFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const titleLines = wrapText(ctx, title.toUpperCase(), headerBoxW * 0.9);
      const lineHeight = titleFontSize * scaleFactor * 1.2;
      const titleStartY = dist35 + (headerBoxH / 2) - ((titleLines.length - 1) * lineHeight / 2);
      
      titleLines.forEach((line, i) => {
        ctx.fillText(line, width / 2, titleStartY + (i * lineHeight));
      });
    }

    // Footer Box
    if (phone) {
      const fY = height - dist35 - footerBoxH;
      ctx.fillStyle = footerBg;
      roundRect(ctx, dist35, fY, headerBoxW, footerBoxH, 20);
      ctx.fill();

      let footerContent = phone.toUpperCase();
      if (contactIcon === 'whatsapp') footerContent = `💬 ${footerContent}`;
      if (contactIcon === 'phone') footerContent = `📞 ${footerContent}`;

      ctx.fillStyle = footerTextColor;
      ctx.font = `900 ${phoneFontSize * scaleFactor}px ${phoneFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(footerContent, width / 2, fY + (footerBoxH / 2));
    }

    // Border
    if (borderWidth > 0) {
      const strokeW = (borderWidth / 10) * scaleFactor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = strokeW;
      roundRect(ctx, strokeW / 2, strokeW / 2, width - strokeW, height - strokeW, 30);
      ctx.stroke();
    }

    // Body Content Area
    const bodyStartY = dist35 + headerBoxH + (height * 0.04);
    const bodyEndY = phone ? (height - dist35 - footerBoxH - (height * 0.04)) : (height - dist35);
    const bodyHeight = bodyEndY - bodyStartY;
    const bodyCenterY = bodyStartY + (bodyHeight / 2);

    // Subtitle
    if (subtitle) {
      ctx.fillStyle = bodyTextColor;
      ctx.font = `900 ${subtitleFontSize * scaleFactor}px ${subtitleFont}`;
      ctx.textAlign = loadedImage ? 'left' : 'center';
      ctx.textBaseline = 'middle';
      
      const subtitleX = loadedImage ? (width * 0.08) : (width / 2);
      const subtitleMaxWidth = loadedImage ? (width * 0.5) : (width * 0.85);
      const subtitleLines = wrapText(ctx, subtitle.toUpperCase(), subtitleMaxWidth);
      const lineHeight = subtitleFontSize * scaleFactor * 1.2;
      const subtitleStartY = bodyCenterY - ((subtitleLines.length - 1) * lineHeight / 2);
      
      subtitleLines.forEach((line, i) => {
        ctx.fillText(line, subtitleX, subtitleStartY + (i * lineHeight));
      });
    }

    // Image
    if (loadedImage) {
      const imageSize = Math.min(bodyHeight * 0.85, width * 0.45);
      const imgAspect = loadedImage.width / loadedImage.height;
      let drawW = imageSize;
      let drawH = imageSize / imgAspect;
      
      if (drawH > imageSize) {
        drawH = imageSize;
        drawW = imageSize * imgAspect;
      }
      
      const imgX = width * 0.92 - drawW;
      const imgY = bodyCenterY - drawH / 2;
      
      ctx.drawImage(loadedImage, imgX, imgY, drawW, drawH);
    }

  }, [
    orientation, bgColor, headerBg, headerTextColor, footerBg, footerTextColor,
    bodyTextColor, borderColor, borderWidth, title, subtitle, phone,
    contactIcon, loadedImage, headerHeight, footerHeight,
    titleFontSize, subtitleFontSize, phoneFontSize,
    titleFont, subtitleFont, phoneFont
  ]);

  // Atualizar canvas quando qualquer prop mudar
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="max-w-[1700px] mx-auto flex flex-col gap-6 animate-fade-in pb-20">
      {/* Painel de Controle Superior */}
      <div className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 no-print flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sinalização Industrial</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Painel de Edição Superior</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-black transition-all">Imprimir</button>
            <button onClick={saveAsPNG} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all">Exportar PNG</button>
          </div>
        </div>

        {/* Grade de Controles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Seção 1: Textos */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Conteúdo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2 outline-none font-bold text-xs" />
            <FontSelector label="Fonte do Título" value={titleFont} onChange={setTitleFont} />
            <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo" rows={2} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2 outline-none font-bold text-xs resize-none" />
            <FontSelector label="Fonte do Subtítulo" value={subtitleFont} onChange={setSubtitleFont} />
            
            <div className="space-y-2">
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button 
                        onClick={() => setContactIcon('none')}
                        className={`flex-1 py-1 px-2 rounded-md text-[8px] font-black uppercase transition-all ${contactIcon === 'none' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >Sem Ícone</button>
                    <button 
                        onClick={() => setContactIcon('phone')}
                        className={`flex-1 py-1 px-2 rounded-md text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${contactIcon === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                        Tel
                    </button>
                    <button 
                        onClick={() => setContactIcon('whatsapp')}
                        className={`flex-1 py-1 px-2 rounded-md text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${contactIcon === 'whatsapp' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03a11.972 11.972 0 001.605 6.057L0 24l6.132-1.61a11.874 11.874 0 005.915 1.569h.005c6.632 0 12.028-5.398 12.03-12.03a11.85 11.85 0 00-3.48-8.502z"/></svg>
                        Whats
                    </button>
                </div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Número de Telefone" className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2 outline-none font-black text-xs text-indigo-600" />
                <FontSelector label="Fonte do Telefone" value={phoneFont} onChange={setPhoneFont} />
            </div>
          </div>

          {/* Seção 2: Imagem e IA */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Multimídia & IA</label>
            <div className="relative group">
               <input 
                type="text" 
                value={imageSearchQuery} 
                onChange={(e) => setImageSearchQuery(e.target.value)} 
                placeholder="Pesquisar imagem..." 
                className="w-full border border-slate-100 bg-slate-50 rounded-xl pl-4 pr-10 py-2.5 outline-none font-bold text-[10px]"
               />
               <button onClick={handleSearchImageIA} disabled={isProcessingIA} className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </button>
            </div>
            <div className="flex gap-2">
              <label className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest text-center cursor-pointer hover:bg-slate-200">
                Upload
                <input type="file" className="hidden" accept="image/*" onChange={handleBodyImageUpload} />
              </label>
              {bodyImage && (
                <>
                  <button onClick={handleRemoveBgIA} disabled={isProcessingIA} className="flex-1 bg-rose-50 text-rose-600 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-rose-100">Remover Fundo</button>
                  <button onClick={() => setBodyImage(null)} className="bg-red-100 text-red-600 px-3 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-red-200">X</button>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSize(size === 'A4' ? 'A3' : 'A4')} className="bg-slate-50 border border-slate-100 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{size}</button>
              <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-slate-50 border border-slate-100 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{orientation === 'portrait' ? 'Vertical' : 'Horizontal'}</button>
            </div>
          </div>

          {/* Seção 3: Cores (1/2) */}
          <div className="grid grid-cols-2 gap-2">
            <SimpleColorSelector label="Fundo Placa" value={bgColor} onChange={setBgColor} />
            <SimpleColorSelector label="Fundo Header" value={headerBg} onChange={setHeaderBg} />
            <SimpleColorSelector label="Texto Header" value={headerTextColor} onChange={setHeaderTextColor} />
          </div>

          {/* Seção Contorno */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contorno (Borda)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-8 h-8 p-0.5 border border-slate-200 rounded-lg cursor-pointer" />
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{borderColor}</span>
              <div className="flex items-center gap-1 ml-auto">
                <input type="number" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-12 h-8 text-center text-xs font-black border border-slate-200 rounded-lg" min="0" max="200" step="5" />
                <span className="text-[8px] font-black text-slate-400">PX</span>
              </div>
            </div>
          </div>

          {/* Seção 4: Ajustes Finos */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Altura Header</span><span>{headerHeight}%</span></div>
                <input type="range" min="10" max="60" value={headerHeight} onChange={(e) => setHeaderHeight(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Tamanho Fonte Título</span><span>{titleFontSize}</span></div>
                <input type="range" min="1" max="50" value={titleFontSize} onChange={(e) => setTitleFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
              </div>
              <div className="space-y-1">
                  <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Tamanho Fonte Subtítulo</span><span>{subtitleFontSize}</span></div>
                  <input type="range" min="1" max="50" value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
              </div>
              <div className="space-y-1">
                  <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Tamanho Fonte Telefone</span><span>{phoneFontSize}</span></div>
                  <input type="range" min="1" max="50" value={phoneFontSize} onChange={(e) => setPhoneFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
              </div>
             <div className="grid grid-cols-2 gap-2 pt-1">
                <SimpleColorSelector label="Texto Corpo" value={bodyTextColor} onChange={setBodyTextColor} />
                <SimpleColorSelector label="Texto Rodapé" value={footerTextColor} onChange={setFooterTextColor} />
             </div>
          </div>
        </div>
      </div>

      {/* Área de Preview Centralizada */}
      <div className="flex flex-col items-center justify-start min-h-[800px] w-full mt-4">
        <div className="shadow-2xl border border-slate-200 rounded-[2rem] overflow-hidden bg-white">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
          💡 Dica: Use os controles acima para personalizar sua placa de sinalização.
        </p>
      </div>

      <style>
        {`
          @media print {
            @page {
              size: ${orientation};
              margin: 0;
            }
            .print-only {
              display: flex !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              z-index: 9999 !important;
              background: white !important;
              flex-direction: column !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
      
      <div className="print-only">
        {printImageSrc && <img src={printImageSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>
    </div>
  );
};

export default SignGenerator;
