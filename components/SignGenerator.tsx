
import React, { useState, useRef, useEffect, useCallback } from 'react';

type SignSize = 'A4' | 'A3';
type ContactIcon = 'none' | 'phone' | 'whatsapp';

interface ColorSelectorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const SimpleColorSelector: React.FC<ColorSelectorProps> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2 py-1">
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-5 h-5 p-0 border border-slate-200 rounded cursor-pointer" />
    <span className="text-[7px] font-black uppercase text-slate-500 tracking-wide">{label}</span>
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

  const saveAsPNG = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `placa-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

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
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const subtitleX = width / 2;
      const subtitleMaxWidth = width * 0.85;
      const subtitleLines = wrapText(ctx, subtitle.toUpperCase(), subtitleMaxWidth);
      const lineHeight = subtitleFontSize * scaleFactor * 1.2;
      const subtitleStartY = bodyCenterY - ((subtitleLines.length - 1) * lineHeight / 2);
      
      subtitleLines.forEach((line, i) => {
        ctx.fillText(line, subtitleX, subtitleStartY + (i * lineHeight));
      });
    }

  }, [
    orientation, bgColor, headerBg, headerTextColor, footerBg, footerTextColor,
    bodyTextColor, borderColor, borderWidth, title, subtitle, phone,
    contactIcon, headerHeight, footerHeight,
    titleFontSize, subtitleFontSize, phoneFontSize,
    titleFont, subtitleFont, phoneFont
  ]);

  // Atualizar canvas quando qualquer prop mudar
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="max-w-[1700px] mx-auto flex flex-col gap-6 animate-fade-in pb-20">
      {/* Header com botões */}
      <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sinalização Industrial</h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Gerador de Placas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-black transition-all">Imprimir</button>
          <button onClick={saveAsPNG} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all">Exportar PNG</button>
        </div>
      </div>

      {/* Layout Principal: Ajustes | Preview | Cores */}
      <div className="flex gap-4 no-print">
        {/* Coluna Esquerda: Ajustes de Tamanho */}
        <div className="w-52 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Ajustes</label>
          <div className="space-y-1">
            <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Altura Header</span><span>{headerHeight}%</span></div>
            <input type="range" min="10" max="60" value={headerHeight} onChange={(e) => setHeaderHeight(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Fonte Título</span><span>{titleFontSize}</span></div>
            <input type="range" min="1" max="50" value={titleFontSize} onChange={(e) => setTitleFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Fonte Subtítulo</span><span>{subtitleFontSize}</span></div>
            <input type="range" min="1" max="50" value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[7px] font-black uppercase text-slate-500"><span>Fonte Telefone</span><span>{phoneFontSize}</span></div>
            <input type="range" min="1" max="50" value={phoneFontSize} onChange={(e) => setPhoneFontSize(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5" />
          </div>
          {/* Contorno */}
          <div className="pt-2 border-t border-slate-200 mt-2">
            <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Contorno</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-5 h-5 p-0 border border-slate-200 rounded cursor-pointer" />
              <input type="number" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-12 h-6 text-center text-[10px] font-black border border-slate-200 rounded" min="0" max="200" step="5" />
              <span className="text-[7px] font-black text-slate-400">PX</span>
            </div>
          </div>
          {/* Tamanho e Orientação */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 mt-2">
            <button onClick={() => setSize(size === 'A4' ? 'A3' : 'A4')} className="bg-white border border-slate-200 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{size}</button>
            <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-white border border-slate-200 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{orientation === 'portrait' ? 'Vert' : 'Horiz'}</button>
          </div>
        </div>

        {/* Coluna Central: Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="shadow-2xl border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Coluna Direita: Conteúdo e Cores */}
        <div className="w-64 space-y-3 shrink-0">
          {/* Conteúdo */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conteúdo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-bold text-[10px]" />
            <FontSelector label="Fonte Título" value={titleFont} onChange={setTitleFont} />
            <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo" rows={2} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-bold text-[10px] resize-none" />
            <FontSelector label="Fonte Subtítulo" value={subtitleFont} onChange={setSubtitleFont} />
            
            <div className="flex gap-1 p-0.5 bg-slate-200 rounded-lg">
              <button onClick={() => setContactIcon('none')} className={`flex-1 py-1 rounded text-[7px] font-black uppercase ${contactIcon === 'none' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Sem</button>
              <button onClick={() => setContactIcon('phone')} className={`flex-1 py-1 rounded text-[7px] font-black uppercase ${contactIcon === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>📞</button>
              <button onClick={() => setContactIcon('whatsapp')} className={`flex-1 py-1 rounded text-[7px] font-black uppercase ${contactIcon === 'whatsapp' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>💬</button>
            </div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-black text-[10px] text-indigo-600" />
            <FontSelector label="Fonte Telefone" value={phoneFont} onChange={setPhoneFont} />
          </div>

          {/* Cores */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cores</label>
            <div className="flex flex-col mt-2">
              <SimpleColorSelector label="Fundo Placa" value={bgColor} onChange={setBgColor} />
              <SimpleColorSelector label="Fundo Header" value={headerBg} onChange={setHeaderBg} />
              <SimpleColorSelector label="Texto Header" value={headerTextColor} onChange={setHeaderTextColor} />
              <SimpleColorSelector label="Texto Corpo" value={bodyTextColor} onChange={setBodyTextColor} />
              <SimpleColorSelector label="Texto Rodapé" value={footerTextColor} onChange={setFooterTextColor} />
            </div>
          </div>
        </div>
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
