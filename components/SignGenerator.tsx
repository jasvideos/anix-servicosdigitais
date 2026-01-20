
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundAI, generateSignImage } from '../services/geminiService';

type SignSize = 'A4' | 'A3';
type ContactIcon = 'none' | 'phone' | 'whatsapp';

const PAINT_COLORS = [
  '#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7'
];

interface ColorSelectorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const PaintColorSelector: React.FC<ColorSelectorProps> = ({ label, value, onChange }) => (
  <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 h-full">
    <div className="flex justify-between items-center px-1">
      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-mono font-bold text-slate-400">{value.toUpperCase()}</span>
        <div className="w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: value }}></div>
      </div>
    </div>
    <div className="grid grid-cols-10 gap-0.5">
      {PAINT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-full aspect-square rounded-sm border ${value === color ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-300'} hover:scale-110 transition-transform`}
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="col-span-10 mt-1 flex items-center gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 py-0.5 rounded cursor-pointer hover:bg-slate-50 transition-colors">
          <span className="text-[7px] font-black uppercase text-slate-500">Customizada</span>
          <input 
            type="color" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="sr-only" 
          />
        </label>
      </div>
    </div>
  </div>
);

const SignGenerator: React.FC = () => {
  const [title, setTitle] = useState('AVISO');
  const [subtitle, setSubtitle] = useState('AMBIENTE MONITORADO');
  const [phone, setPhone] = useState('');
  const [contactIcon, setContactIcon] = useState<ContactIcon>('none');
  const [bodyImage, setBodyImage] = useState<string | null>(null);
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

  const [titleFontSize, setTitleFontSize] = useState(12);
  const [subtitleFontSize, setSubtitleFontSize] = useState(10);
  const [phoneFontSize, setPhoneFontSize] = useState(6);
  const [headerHeight, setHeaderHeight] = useState(25);
  const [footerHeight, setFooterHeight] = useState(15);

  const [resizing, setResizing] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.focus();
    window.print();
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
    document.fonts.ready.then(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const baseWidth = orientation === 'portrait' ? 2480 : 3508;
      const baseHeight = orientation === 'portrait' ? 3508 : 2480;
      
      canvas.width = baseWidth;
      canvas.height = baseHeight;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleFactor = canvas.width / 100;
      const dist35 = (3.5 / 100) * canvas.width;
      const outerRadius = 40 * (canvas.width / 800); 
      const innerRadius = 25 * (canvas.width / 800); 
      
      const headerBoxH = canvas.height * (headerHeight / 100); 
      const footerBoxH = phone ? canvas.height * (footerHeight / 100) : 0;
      const headerBoxW = canvas.width - (dist35 * 2);
      
      const hX = dist35;
      const hY = dist35;

      ctx.fillStyle = headerBg;
      ctx.beginPath();
      if ((ctx as any).roundRect) (ctx as any).roundRect(hX, hY, headerBoxW, headerBoxH, innerRadius);
      else ctx.rect(hX, hY, headerBoxW, headerBoxH);
      ctx.fill();

      if (phone) {
        const fY = canvas.height - dist35 - footerBoxH;
        ctx.fillStyle = footerBg;
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(hX, fY, headerBoxW, footerBoxH, innerRadius);
        else ctx.rect(hX, fY, headerBoxW, footerBoxH);
        ctx.fill();
        
        let footerText = phone;
        const fontSizePx = phoneFontSize * scaleFactor;
        ctx.font = `900 ${fontSizePx}px 'Inter', sans-serif`;
        ctx.fillStyle = footerTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Lógica de ícone no Canvas
        if (contactIcon !== 'none') {
            const iconChar = contactIcon === 'whatsapp' ? '💬 ' : '📞 ';
            footerText = iconChar + phone;
        }
        
        ctx.fillText(footerText.toUpperCase(), canvas.width / 2, fY + (footerBoxH / 2));
      }

      const scaledBorderWidth = (borderWidth / 10) * scaleFactor;
      if (scaledBorderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = scaledBorderWidth;
        const inset = scaledBorderWidth / 2;
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(inset, inset, canvas.width - (inset * 2), canvas.height - (inset * 2), outerRadius);
        else ctx.rect(inset, inset, canvas.width - (inset * 2), canvas.height - (inset * 2));
        ctx.stroke();
      }

      function drawTextWrapped(text: string, x: number, y: number, desiredFontSize: number, maxWidth: number, color: string, alignment: CanvasTextAlign = 'center') {
        const fontSizePx = desiredFontSize * scaleFactor;
        ctx!.font = `900 ${fontSizePx}px 'Inter', sans-serif`;
        ctx!.fillStyle = color;
        ctx!.textAlign = alignment;
        ctx!.textBaseline = 'middle';

        const paragraphs = text.split('\n');
        let lines: string[] = [];
        paragraphs.forEach(paragraph => {
          const words = paragraph.split(' ');
          let currentLine = '';
          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx!.measureText(testLine.toUpperCase());
            if (metrics.width > maxWidth && currentLine !== '') {
              lines.push(currentLine.toUpperCase());
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          lines.push(currentLine.toUpperCase());
        });

        const lineHeight = fontSizePx * 1.1;
        const totalHeight = lineHeight * lines.length;
        let startY = y - (totalHeight / 2) + (lineHeight / 2);
        lines.forEach(line => {
          ctx!.fillText(line, x, startY);
          startY += lineHeight;
        });
      }

      drawTextWrapped(title, canvas.width / 2, hY + (headerBoxH / 2), titleFontSize, headerBoxW * 0.9, headerTextColor, 'center');

      const bodyStartY = hY + headerBoxH + (canvas.height * 0.04);
      const bodyEndY = phone ? (canvas.height - dist35 - footerBoxH - (canvas.height * 0.04)) : (canvas.height - hY);
      const bodyHeight = bodyEndY - bodyStartY;
      const bodyCenterY = bodyStartY + (bodyHeight / 2);

      const bodySafeWidth = canvas.width * 0.85;
      
      if (bodyImage) {
        const img = new Image();
        img.onload = () => {
          const maxImgW = bodySafeWidth * 0.45;
          const maxImgH = bodyHeight * 0.95;
          
          let drawW = maxImgW;
          let drawH = maxImgW;

          const imgRatio = img.width / img.height;
          const containerRatio = maxImgW / maxImgH;

          if (imgRatio > containerRatio) { drawW = maxImgW; drawH = maxImgW / imgRatio; } 
          else { drawH = maxImgH; drawW = maxImgH * imgRatio; }

          const imgX = (canvas.width * 0.95) - drawW;
          const imgY = bodyCenterY - (drawH / 2);
          ctx!.drawImage(img, imgX, imgY, drawW, drawH);
          
          const textMaxWidth = (imgX - (canvas.width * 0.05)) - (canvas.width * 0.05);
          const textCenterX = (canvas.width * 0.05) + (textMaxWidth / 2);
          drawTextWrapped(subtitle, textCenterX, bodyCenterY, subtitleFontSize, textMaxWidth, bodyTextColor, 'center');
          finalizeAndDownload(canvas, title);
        };
        img.src = bodyImage;
      } else {
        drawTextWrapped(subtitle, canvas.width / 2, bodyCenterY, subtitleFontSize, bodySafeWidth, bodyTextColor, 'center');
        finalizeAndDownload(canvas, title);
      }
    });
  };

  const finalizeAndDownload = (canvas: HTMLCanvasElement, title: string) => {
    const link = document.createElement('a');
    link.download = `placa-${typeToFilename(title)}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const typeToFilename = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!resizing || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const delta = (e.movementY / rect.height) * 100;

      if (resizing === 'header') {
        const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
        const newHeight = Math.max(10, Math.min(80, relativeY - 3.5)); 
        setHeaderHeight(newHeight);
      } else if (resizing === 'title-font') {
          setTitleFontSize(prev => Math.max(1, Math.min(60, prev - delta)));
      } else if (resizing === 'subtitle-font') {
          setSubtitleFontSize(prev => Math.max(1, Math.min(50, prev - delta)));
      } else if (resizing === 'phone-font') {
          setPhoneFontSize(prev => Math.max(1, Math.min(50, prev - delta)));
      }
    };

    const handleGlobalMouseUp = () => setResizing(null);

    if (resizing) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizing]);

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
            <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo" rows={2} className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2 outline-none font-bold text-xs resize-none" />
            
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
                <button onClick={handleRemoveBgIA} disabled={isProcessingIA} className="flex-1 bg-rose-50 text-rose-600 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-rose-100">Remover Fundo</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSize(size === 'A4' ? 'A3' : 'A4')} className="bg-slate-50 border border-slate-100 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{size}</button>
              <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-slate-50 border border-slate-100 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{orientation === 'portrait' ? 'Vertical' : 'Horizontal'}</button>
            </div>
          </div>

          {/* Seção 3: Cores (1/2) */}
          <div className="grid grid-cols-2 gap-2">
            <PaintColorSelector label="Fundo Placa" value={bgColor} onChange={setBgColor} />
            <PaintColorSelector label="Fundo Header" value={headerBg} onChange={setHeaderBg} />
            <PaintColorSelector label="Texto Header" value={headerTextColor} onChange={setHeaderTextColor} />
            <PaintColorSelector label="Cor Borda" value={borderColor} onChange={setBorderColor} />
          </div>

          {/* Seção 4: Ajustes Finos */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Borda</span><span>{borderWidth/10}</span></div>
                <input type="range" min="0" max="200" step="5" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Altura Header</span><span>{headerHeight}%</span></div>
                <input type="range" min="10" max="60" value={headerHeight} onChange={(e) => setHeaderHeight(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
             </div>
             <div className="grid grid-cols-2 gap-2 pt-1">
                <PaintColorSelector label="Texto Corpo" value={bodyTextColor} onChange={setBodyTextColor} />
                <PaintColorSelector label="Texto Rodapé" value={footerTextColor} onChange={setFooterTextColor} />
             </div>
          </div>
        </div>
      </div>

      {/* Área de Preview Centralizada */}
      <div className="flex flex-col items-center justify-start min-h-[800px] w-full mt-4">
        <div 
          ref={previewRef}
          style={{
            width: '100%',
            maxWidth: orientation === 'portrait' ? '500px' : '800px',
            aspectRatio: orientation === 'portrait' ? (size === 'A4' ? '210/297' : '297/420') : (size === 'A4' ? '297/210' : '420/297'),
            backgroundColor: bgColor,
            position: 'relative',
            containerType: 'inline-size',
            overflow: 'hidden',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '5cqw' 
          }}
          className="shadow-2xl group border border-slate-200"
        >
          {/* Cabeçalho */}
          <div 
            style={{
              backgroundColor: headerBg,
              width: 'calc(100% - 7cqw)', 
              margin: '3.5cqw 3.5cqw 0 3.5cqw',
              height: `${headerHeight}%`, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              padding: '0 5%',
              borderRadius: '3cqw',
              position: 'relative',
              flexShrink: 0
            }}
          >
            <h1 
              onMouseDown={(e) => { e.stopPropagation(); setResizing('title-font'); }}
              style={{ fontSize: `${titleFontSize}cqw`, color: headerTextColor }}
              className="font-black uppercase tracking-tighter leading-[1] text-center whitespace-pre-wrap relative group/text cursor-ns-resize max-w-full select-none"
            >
              {title}
              <div 
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full opacity-0 group-hover/text:opacity-100 shadow-md transition-opacity z-50 pointer-events-none"
              />
            </h1>
            <div 
               onMouseDown={(e) => { e.stopPropagation(); setResizing('header'); }}
               className="absolute bottom-0 left-0 right-0 h-2 bg-indigo-500/0 hover:bg-indigo-500/30 cursor-ns-resize z-50 transition-colors"
            />
          </div>

          <div 
            style={{
              position: 'absolute',
              inset: '0',
              border: `calc(${borderWidth}cqw / 10) solid ${borderColor}`,
              pointerEvents: 'none',
              zIndex: 20,
              borderRadius: '5cqw' 
            }}
          />

          {/* Corpo */}
          <div className={`flex-1 w-full flex ${bodyImage ? 'flex-row items-center justify-between' : 'flex-col items-center justify-center'} z-10 px-[6%] gap-[4%] overflow-hidden py-[4%]`}>
            <div className={`flex flex-col ${bodyImage ? 'flex-[1.5] text-center items-center' : 'w-full text-center items-center'} justify-center overflow-hidden min-w-0`}>
              <h2 
                onMouseDown={(e) => { e.stopPropagation(); setResizing('subtitle-font'); }}
                style={{ fontSize: `${subtitleFontSize}cqw`, color: bodyTextColor }}
                className="font-black uppercase tracking-tighter leading-[1] w-full break-words whitespace-pre-wrap relative group/sub cursor-ns-resize select-none"
              >
                {subtitle}
                <div 
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full opacity-0 group-hover/sub:opacity-100 shadow-md transition-opacity z-50 pointer-events-none"
                />
              </h2>
            </div>

            {bodyImage && (
              <div className="flex-1 flex items-center justify-center h-full max-h-[90%] overflow-hidden py-2">
                <img src={bodyImage} className="max-w-full max-h-full object-contain drop-shadow-xl" alt="Decoração" />
              </div>
            )}
          </div>

          {/* Rodapé Dinâmico */}
          {phone && (
            <div 
              style={{
                backgroundColor: footerBg,
                width: 'calc(100% - 7cqw)', 
                margin: '0 3.5cqw 3.5cqw 3.5cqw',
                height: `${footerHeight}%`, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                padding: '0 5%',
                borderRadius: '3cqw',
                position: 'relative',
                flexShrink: 0
              }}
            >
              <div 
                onMouseDown={(e) => { e.stopPropagation(); setResizing('phone-font'); }}
                className="flex items-center gap-[2cqw] relative group/phone cursor-ns-resize select-none"
              >
                {contactIcon === 'phone' && (
                    <svg style={{ width: `${phoneFontSize * 0.9}cqw`, height: `${phoneFontSize * 0.9}cqw`, color: footerTextColor }} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                )}
                {contactIcon === 'whatsapp' && (
                    <svg style={{ width: `${phoneFontSize * 1.1}cqw`, height: `${phoneFontSize * 1.1}cqw`, color: footerTextColor }} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03a11.972 11.972 0 001.605 6.057L0 24l6.132-1.61a11.874 11.874 0 005.915 1.569h.005c6.632 0 12.028-5.398 12.03-12.03a11.85 11.85 0 00-3.48-8.502z"/></svg>
                )}
                <p 
                    style={{ fontSize: `${phoneFontSize}cqw`, color: footerTextColor }}
                    className="font-black tracking-tighter leading-none uppercase"
                >
                    {phone}
                </p>
                <div 
                  className="absolute -bottom-1 -right-4 w-4 h-4 bg-white border-2 border-slate-900 rounded-full opacity-0 group-hover/phone:opacity-100 shadow-md transition-opacity z-50 pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @media print {
            .print-full {
              display: flex !important;
              position: fixed !important;
              inset: 0 !important;
              z-index: 9999 !important;
              background: ${bgColor} !important;
              width: 100vw !important;
              height: 100vh !important;
              flex-direction: column !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-header-box {
              background-color: ${headerBg} !important;
              margin: 3.5vw 3.5vw 0 3.5vw !important;
              width: calc(100% - 7vw) !important;
              height: ${headerHeight}% !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              padding: 0 5% !important;
              border-radius: 3vw !important;
              flex-shrink: 0 !important;
            }
            .print-footer-box {
              background-color: ${footerBg} !important;
              margin: 0 3.5vw 3.5vw 3.5vw !important;
              width: calc(100% - 7vw) !important;
              height: ${footerHeight}% !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              padding: 0 5% !important;
              border-radius: 3vw !important;
              flex-shrink: 0 !important;
            }
            .print-border {
              position: absolute !important;
              inset: 0 !important;
              border: ${borderWidth / 10}vw solid ${borderColor} !important;
              pointer-events: none !important;
              border-radius: 5vw !important;
            }
            .print-title {
              font-size: ${titleFontSize}vw !important;
              color: ${headerTextColor} !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              text-align: center !important;
              line-height: 1 !important;
              white-space: pre-wrap !important;
            }
            .print-body {
              flex: 1 !important;
              display: flex !important;
              flex-direction: ${bodyImage ? 'row' : 'column'} !important;
              align-items: center !important;
              justify-content: ${bodyImage ? 'space-between' : 'center'} !important;
              gap: 3vw !important;
              padding: 4% 6% !important;
              overflow: hidden !important;
            }
            .print-text-col {
              flex: ${bodyImage ? '1.5' : '1'} !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              text-align: center !important;
              min-width: 0 !important;
            }
            .print-text {
              color: ${bodyTextColor} !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              line-height: 1 !important;
              white-space: pre-wrap !important;
            }
            .print-img-col {
              flex: 1 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              max-height: 90% !important;
            }
            .print-img {
              max-width: 100% !important;
              max-height: 100% !important;
              object-fit: contain !important;
            }
            .print-phone {
              font-size: ${phoneFontSize}vw !important;
              color: ${footerTextColor} !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              text-align: center !important;
              display: flex !important;
              align-items: center !important;
              gap: 1.5vw !important;
            }
            .print-icon {
              height: ${phoneFontSize * 0.9}vw !important;
              width: ${phoneFontSize * 0.9}vw !important;
            }
          }
        `}
      </style>
      
      <div className="hidden print-full">
        <div className="print-header-box">
          <span className="print-title">{title}</span>
        </div>
        <div className="print-border"></div>
        <div className="print-body">
          <div className="print-text-col">
            <span className="print-text" style={{ fontSize: `${subtitleFontSize}vw` }}>{subtitle}</span>
          </div>
          {bodyImage && (
            <div className="print-img-col">
              <img src={bodyImage} className="print-img" alt="imagem" />
            </div>
          )}
        </div>
        {phone && (
          <div className="print-footer-box">
            <div className="print-phone">
                {contactIcon === 'phone' && (
                    <svg className="print-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                )}
                {contactIcon === 'whatsapp' && (
                    <svg className="print-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03a11.972 11.972 0 001.605 6.057L0 24l6.132-1.61a11.874 11.874 0 005.915 1.569h.005c6.632 0 12.028-5.398 12.03-12.03a11.85 11.85 0 00-3.48-8.502z"/></svg>
                )}
                <span>{phone}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignGenerator;
