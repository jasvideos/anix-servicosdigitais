
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

// Componente de controle numérico com botões de setas
interface NumericControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

const NumericControl: React.FC<NumericControlProps> = ({ label, value, onChange, min, max, step = 1, unit }) => {
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? step : -step;
    const newValue = Math.min(max, Math.max(min, value + delta));
    onChange(newValue);
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-2 py-1">
      <span className="text-[7px] font-black uppercase text-slate-500">{label}</span>
      <div className="flex items-center gap-1" onWheel={handleWheel}>
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs"
        >−</button>
        <span className="w-8 text-center text-[10px] font-black text-indigo-600">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs"
        >+</button>
        {unit && <span className="text-[7px] font-black text-slate-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
};

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

  // Estados para redimensionamento e movimentação interativa
  const [hoveredElement, setHoveredElement] = useState<'title' | 'subtitle' | null>(null);
  const [interactionMode, setInteractionMode] = useState<'none' | 'resize-h' | 'resize-v' | 'drag'>('none');
  const [activeElement, setActiveElement] = useState<'title' | 'subtitle' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number; size: number; scaleX: number; scaleY: number } | null>(null);
  
  // Offsets de posição para movimentação livre
  const [titleOffsetX, setTitleOffsetX] = useState(0);
  const [titleOffsetY, setTitleOffsetY] = useState(0);
  const [subtitleOffsetX, setSubtitleOffsetX] = useState(0);
  const [subtitleOffsetY, setSubtitleOffsetY] = useState(0);
  
  // Escalas para esticar texto horizontalmente/verticalmente
  const [titleScaleX, setTitleScaleX] = useState(1);
  const [titleScaleY, setTitleScaleY] = useState(1);
  const [subtitleScaleX, setSubtitleScaleX] = useState(1);
  const [subtitleScaleY, setSubtitleScaleY] = useState(1);
  
  const textAreasRef = useRef<{ title: { x: number; y: number; w: number; h: number }; subtitle: { x: number; y: number; w: number; h: number } }>({
    title: { x: 0, y: 0, w: 0, h: 0 },
    subtitle: { x: 0, y: 0, w: 0, h: 0 }
  });

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

  // Helper para pegar posição do mouse no canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Verificar se mouse está sobre handle de resize horizontal (direita)
  const isOverHHandle = (pos: { x: number; y: number }, area: { x: number; y: number; w: number; h: number }) => {
    const handleX = area.x + area.w - 8;
    const handleY = area.y + area.h / 2 - 8;
    return pos.x >= handleX && pos.x <= handleX + 16 && pos.y >= handleY && pos.y <= handleY + 16;
  };

  // Verificar se mouse está sobre handle de resize vertical (baixo)
  const isOverVHandle = (pos: { x: number; y: number }, area: { x: number; y: number; w: number; h: number }) => {
    const handleX = area.x + area.w / 2 - 8;
    const handleY = area.y + area.h - 8;
    return pos.x >= handleX && pos.x <= handleX + 16 && pos.y >= handleY && pos.y <= handleY + 16;
  };

  // Verificar se mouse está sobre área do elemento
  const isOverArea = (pos: { x: number; y: number }, area: { x: number; y: number; w: number; h: number }) => {
    return pos.x >= area.x && pos.x <= area.x + area.w && pos.y >= area.y && pos.y <= area.y + area.h;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    
    // Durante interação ativa
    if (activeElement && dragStart && canvas) {
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      
      if (interactionMode === 'resize-h') {
        // Esticar horizontalmente (scale X)
        const sensitivity = 0.003;
        const newScale = Math.max(0.3, Math.min(3, dragStart.scaleX + deltaX * sensitivity));
        if (activeElement === 'title') setTitleScaleX(newScale);
        else setSubtitleScaleX(newScale);
      } else if (interactionMode === 'resize-v') {
        // Esticar verticalmente (scale Y)
        const sensitivity = 0.003;
        const newScale = Math.max(0.3, Math.min(3, dragStart.scaleY + deltaY * sensitivity));
        if (activeElement === 'title') setTitleScaleY(newScale);
        else setSubtitleScaleY(newScale);
      } else if (interactionMode === 'drag') {
        // Movimentação livre
        if (activeElement === 'title') {
          setTitleOffsetX(dragStart.offsetX + deltaX);
          setTitleOffsetY(dragStart.offsetY + deltaY);
        } else {
          setSubtitleOffsetX(dragStart.offsetX + deltaX);
          setSubtitleOffsetY(dragStart.offsetY + deltaY);
        }
      }
      return;
    }

    // Detectar hover
    const titleArea = textAreasRef.current.title;
    const subtitleArea = textAreasRef.current.subtitle;
    
    if (isOverArea(pos, titleArea)) {
      setHoveredElement('title');
      if (canvas) {
        if (isOverHHandle(pos, titleArea)) canvas.style.cursor = 'ew-resize';
        else if (isOverVHandle(pos, titleArea)) canvas.style.cursor = 'ns-resize';
        else canvas.style.cursor = 'move';
      }
    } else if (isOverArea(pos, subtitleArea)) {
      setHoveredElement('subtitle');
      if (canvas) {
        if (isOverHHandle(pos, subtitleArea)) canvas.style.cursor = 'ew-resize';
        else if (isOverVHandle(pos, subtitleArea)) canvas.style.cursor = 'ns-resize';
        else canvas.style.cursor = 'move';
      }
    } else {
      setHoveredElement(null);
      if (canvas) canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const titleArea = textAreasRef.current.title;
    const subtitleArea = textAreasRef.current.subtitle;
    
    // Title interactions
    if (isOverHHandle(pos, titleArea)) {
      setActiveElement('title');
      setInteractionMode('resize-h');
      setDragStart({ x: pos.x, y: pos.y, offsetX: titleOffsetX, offsetY: titleOffsetY, size: titleFontSize, scaleX: titleScaleX, scaleY: titleScaleY });
    } else if (isOverVHandle(pos, titleArea)) {
      setActiveElement('title');
      setInteractionMode('resize-v');
      setDragStart({ x: pos.x, y: pos.y, offsetX: titleOffsetX, offsetY: titleOffsetY, size: titleFontSize, scaleX: titleScaleX, scaleY: titleScaleY });
    } else if (isOverArea(pos, titleArea)) {
      setActiveElement('title');
      setInteractionMode('drag');
      setDragStart({ x: pos.x, y: pos.y, offsetX: titleOffsetX, offsetY: titleOffsetY, size: titleFontSize, scaleX: titleScaleX, scaleY: titleScaleY });
    }
    // Subtitle interactions
    else if (isOverHHandle(pos, subtitleArea)) {
      setActiveElement('subtitle');
      setInteractionMode('resize-h');
      setDragStart({ x: pos.x, y: pos.y, offsetX: subtitleOffsetX, offsetY: subtitleOffsetY, size: subtitleFontSize, scaleX: subtitleScaleX, scaleY: subtitleScaleY });
    } else if (isOverVHandle(pos, subtitleArea)) {
      setActiveElement('subtitle');
      setInteractionMode('resize-v');
      setDragStart({ x: pos.x, y: pos.y, offsetX: subtitleOffsetX, offsetY: subtitleOffsetY, size: subtitleFontSize, scaleX: subtitleScaleX, scaleY: subtitleScaleY });
    } else if (isOverArea(pos, subtitleArea)) {
      setActiveElement('subtitle');
      setInteractionMode('drag');
      setDragStart({ x: pos.x, y: pos.y, offsetX: subtitleOffsetX, offsetY: subtitleOffsetY, size: subtitleFontSize, scaleX: subtitleScaleX, scaleY: subtitleScaleY });
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveElement(null);
    setInteractionMode('none');
    setDragStart(null);
  };

  const handleCanvasMouseLeave = () => {
    if (!activeElement) {
      setHoveredElement(null);
    }
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
      
      const titleLines = wrapText(ctx, title.toUpperCase(), headerBoxW * 0.9 / titleScaleX);
      const lineHeight = titleFontSize * scaleFactor * 1.2;
      const baseTitleStartY = dist35 + (headerBoxH / 2) - ((titleLines.length - 1) * lineHeight * titleScaleY / 2);
      
      // Aplicar offsets
      const titleCenterX = (width / 2) + titleOffsetX;
      const titleStartY = baseTitleStartY + titleOffsetY;
      
      // Calcular área do título (com escala)
      let maxLineWidth = 0;
      titleLines.forEach((line) => {
        const lw = ctx.measureText(line).width;
        if (lw > maxLineWidth) maxLineWidth = lw;
      });
      const titleW = maxLineWidth * titleScaleX;
      const titleH = titleLines.length * lineHeight * titleScaleY;
      textAreasRef.current.title = {
        x: titleCenterX - (titleW / 2) - 10,
        y: titleStartY - lineHeight * titleScaleY / 2 - 5,
        w: titleW + 20,
        h: titleH + 10
      };
      
      // Desenhar texto com escala
      ctx.save();
      ctx.translate(titleCenterX, titleStartY);
      ctx.scale(titleScaleX, titleScaleY);
      titleLines.forEach((line, i) => {
        ctx.fillText(line, 0, i * lineHeight);
      });
      ctx.restore();
      
      // Desenhar handles se hover
      if (hoveredElement === 'title' || activeElement === 'title') {
        const ta = textAreasRef.current.title;
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(ta.x, ta.y, ta.w, ta.h);
        ctx.setLineDash([]);
        
        // Handle de resize horizontal (direita)
        ctx.fillStyle = '#4F46E5';
        ctx.fillRect(ta.x + ta.w - 8, ta.y + ta.h / 2 - 8, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔', ta.x + ta.w, ta.y + ta.h / 2);
        
        // Handle de resize vertical (baixo)
        ctx.fillStyle = '#4F46E5';
        ctx.fillRect(ta.x + ta.w / 2 - 8, ta.y + ta.h - 8, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('↕', ta.x + ta.w / 2, ta.y + ta.h);
      }
    }

    // Função para desenhar logo WhatsApp vetorial
    const drawWhatsAppLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const scale = size / 24;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      
      ctx.fillStyle = '#25D366';
      
      // Path oficial do WhatsApp
      const path = new Path2D('M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03a11.972 11.972 0 001.605 6.057L0 24l6.132-1.61a11.874 11.874 0 005.915 1.569h.005c6.632 0 12.028-5.398 12.03-12.03a11.85 11.85 0 00-3.48-8.502z');
      ctx.fill(path);
      
      ctx.restore();
    };

    // Footer Box
    if (phone) {
      const fY = height - dist35 - footerBoxH;
      ctx.fillStyle = footerBg;
      roundRect(ctx, dist35, fY, headerBoxW, footerBoxH, 20);
      ctx.fill();

      const footerContent = phone.toUpperCase();
      const iconSize = phoneFontSize * scaleFactor * 1.2;
      
      ctx.fillStyle = footerTextColor;
      ctx.font = `900 ${phoneFontSize * scaleFactor}px ${phoneFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textWidth = ctx.measureText(footerContent).width;
      const totalWidth = iconSize + 15 + textWidth;
      const startX = (width - totalWidth) / 2;
      
      // Desenhar ícone
      if (contactIcon === 'whatsapp') {
        // Ícone WhatsApp verde vetorial
        const iconX = startX;
        const iconY = fY + (footerBoxH / 2) - iconSize / 2;
        drawWhatsAppLogo(ctx, iconX, iconY, iconSize);
        // Texto
        ctx.fillStyle = footerTextColor;
        ctx.font = `900 ${phoneFontSize * scaleFactor}px ${phoneFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(footerContent, startX + iconSize + 15, fY + (footerBoxH / 2));
      } else if (contactIcon === 'phone') {
        // Ícone telefone
        ctx.fillStyle = footerTextColor;
        ctx.font = `900 ${phoneFontSize * scaleFactor}px ${phoneFont}`;
        ctx.textAlign = 'center';
        ctx.fillText(`📞 ${footerContent}`, width / 2, fY + (footerBoxH / 2));
      } else {
        // Sem ícone
        ctx.fillStyle = footerTextColor;
        ctx.font = `900 ${phoneFontSize * scaleFactor}px ${phoneFont}`;
        ctx.textAlign = 'center';
        ctx.fillText(footerContent, width / 2, fY + (footerBoxH / 2));
      }
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
      
      const subtitleMaxWidth = width * 0.85 / subtitleScaleX;
      const subtitleLines = wrapText(ctx, subtitle.toUpperCase(), subtitleMaxWidth);
      const lineHeight = subtitleFontSize * scaleFactor * 1.2;
      const baseSubtitleStartY = bodyCenterY - ((subtitleLines.length - 1) * lineHeight * subtitleScaleY / 2);
      
      // Aplicar offsets
      const subtitleCenterX = (width / 2) + subtitleOffsetX;
      const subtitleStartY = baseSubtitleStartY + subtitleOffsetY;
      
      // Calcular área do subtítulo (com escala)
      let maxLineWidth = 0;
      subtitleLines.forEach((line) => {
        const lw = ctx.measureText(line).width;
        if (lw > maxLineWidth) maxLineWidth = lw;
      });
      const subtitleW = maxLineWidth * subtitleScaleX;
      const subtitleH = subtitleLines.length * lineHeight * subtitleScaleY;
      textAreasRef.current.subtitle = {
        x: subtitleCenterX - (subtitleW / 2) - 10,
        y: subtitleStartY - lineHeight * subtitleScaleY / 2 - 5,
        w: subtitleW + 20,
        h: subtitleH + 10
      };
      
      // Desenhar texto com escala
      ctx.save();
      ctx.translate(subtitleCenterX, subtitleStartY);
      ctx.scale(subtitleScaleX, subtitleScaleY);
      subtitleLines.forEach((line, i) => {
        ctx.fillText(line, 0, i * lineHeight);
      });
      ctx.restore();
      
      // Desenhar handles se hover
      if (hoveredElement === 'subtitle' || activeElement === 'subtitle') {
        const sa = textAreasRef.current.subtitle;
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(sa.x, sa.y, sa.w, sa.h);
        ctx.setLineDash([]);
        
        // Handle de resize horizontal (direita)
        ctx.fillStyle = '#4F46E5';
        ctx.fillRect(sa.x + sa.w - 8, sa.y + sa.h / 2 - 8, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔', sa.x + sa.w, sa.y + sa.h / 2);
        
        // Handle de resize vertical (baixo)
        ctx.fillStyle = '#4F46E5';
        ctx.fillRect(sa.x + sa.w / 2 - 8, sa.y + sa.h - 8, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('↕', sa.x + sa.w / 2, sa.y + sa.h);
      }
    }

  }, [
    orientation, bgColor, headerBg, headerTextColor, footerBg, footerTextColor,
    bodyTextColor, borderColor, borderWidth, title, subtitle, phone,
    contactIcon, headerHeight, footerHeight,
    titleFontSize, subtitleFontSize, phoneFontSize,
    titleFont, subtitleFont, phoneFont,
    hoveredElement, activeElement,
    titleOffsetX, titleOffsetY, subtitleOffsetX, subtitleOffsetY,
    titleScaleX, titleScaleY, subtitleScaleX, subtitleScaleY
  ]);

  // Atualizar canvas quando qualquer prop mudar
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Listener global para mouse up (caso solte fora do canvas)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (activeElement) {
        setActiveElement(null);
        setInteractionMode('none');
        setDragStart(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [activeElement]);

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

      {/* Layout Principal: Conteúdo | Preview | Ajustes */}
      <div className="flex gap-4 no-print">
        {/* Coluna Esquerda: Conteúdo */}
        <div className="w-64 space-y-3 shrink-0">
          {/* Conteúdo */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conteúdo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-bold text-[10px]" />
            <FontSelector label="Fonte Título" value={titleFont} onChange={setTitleFont} />
            <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo" rows={2} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-bold text-[10px] resize-none" />
            <FontSelector label="Fonte Subtítulo" value={subtitleFont} onChange={setSubtitleFont} />
            
            <div className="flex gap-1 p-0.5 bg-slate-200 rounded-lg">
              <button onClick={() => setContactIcon('none')} className={`flex-1 py-1.5 rounded text-[8px] font-black uppercase ${contactIcon === 'none' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Sem</button>
              <button onClick={() => setContactIcon('phone')} className={`flex-1 py-1.5 rounded text-[8px] font-black uppercase ${contactIcon === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>📞 Tel</button>
              <button onClick={() => setContactIcon('whatsapp')} className={`flex-1 py-1.5 rounded text-[8px] font-black uppercase ${contactIcon === 'whatsapp' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>📱 Whats</button>
            </div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 outline-none font-black text-[10px] text-indigo-600" />
            <FontSelector label="Fonte Telefone" value={phoneFont} onChange={setPhoneFont} />
          </div>
        </div>

        {/* Coluna Central: Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="shadow-2xl border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <canvas 
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />
          </div>
        </div>

        {/* Coluna Direita: Ajustes e Contorno */}
        <div className="w-52 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Ajustes</label>
          <NumericControl label="Altura Header" value={headerHeight} onChange={setHeaderHeight} min={10} max={60} step={1} unit="%" />
          <NumericControl label="Fonte Título" value={titleFontSize} onChange={setTitleFontSize} min={1} max={50} step={1} />
          <NumericControl label="Fonte Subtítulo" value={subtitleFontSize} onChange={setSubtitleFontSize} min={1} max={50} step={1} />
          <NumericControl label="Fonte Telefone" value={phoneFontSize} onChange={setPhoneFontSize} min={1} max={50} step={1} />
          {/* Contorno */}
          <div className="pt-2 border-t border-slate-200 mt-2">
            <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-2 py-1">
              <span className="text-[7px] font-black uppercase text-slate-500">Contorno</span>
              <div className="flex items-center gap-1">
                <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-5 h-5 p-0 border border-slate-200 rounded cursor-pointer" />
                <button onClick={() => setBorderWidth(Math.max(0, borderWidth - 5))} className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs">−</button>
                <span className="w-8 text-center text-[10px] font-black text-indigo-600">{borderWidth}</span>
                <button onClick={() => setBorderWidth(Math.min(200, borderWidth + 5))} className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs">+</button>
                <span className="text-[7px] font-black text-slate-400">PX</span>
              </div>
            </div>
          </div>
          {/* Cores */}
          <div className="pt-2 border-t border-slate-200 mt-2">
            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cores</label>
            <div className="flex flex-col mt-1 gap-0.5">
              <SimpleColorSelector label="Fundo Placa" value={bgColor} onChange={setBgColor} />
              <SimpleColorSelector label="Fundo Header" value={headerBg} onChange={setHeaderBg} />
              <SimpleColorSelector label="Fundo Rodapé" value={footerBg} onChange={setFooterBg} />
              <SimpleColorSelector label="Texto Header" value={headerTextColor} onChange={setHeaderTextColor} />
              <SimpleColorSelector label="Texto Corpo" value={bodyTextColor} onChange={setBodyTextColor} />
              <SimpleColorSelector label="Texto Rodapé" value={footerTextColor} onChange={setFooterTextColor} />
            </div>
          </div>
          {/* Tamanho e Orientação */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 mt-2">
            <button onClick={() => setSize(size === 'A4' ? 'A3' : 'A4')} className="bg-white border border-slate-200 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{size}</button>
            <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-white border border-slate-200 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">{orientation === 'portrait' ? 'Vert' : 'Horiz'}</button>
          </div>
          {/* Reset Posições */}
          <button 
            onClick={() => { 
              setTitleOffsetX(0); setTitleOffsetY(0); setSubtitleOffsetX(0); setSubtitleOffsetY(0);
              setTitleScaleX(1); setTitleScaleY(1); setSubtitleScaleX(1); setSubtitleScaleY(1);
            }}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest mt-2"
          >
            Resetar Posições
          </button>
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
