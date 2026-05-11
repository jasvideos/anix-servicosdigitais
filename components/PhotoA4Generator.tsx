
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  fitMode?: 'cover' | 'contain' | 'fill';
  isWordArt?: boolean;
  wordArtText?: string;
  wordArtStyle?: number;
  wordArtColor?: string;
  wordArtBg?: string;
  wordArtStroke?: string;
  isTextNode?: boolean;
  textContent?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
}

const POLAROID_SIDE_MARGIN_RATIO = 0.10; 
const POLAROID_TOP_MARGIN_RATIO = 0.10;  
const POLAROID_BOTTOM_MARGIN_RATIO = 0.17; 
const POLAROID_HEIGHT_RATIO = 1.25; 

const getWordArtSVG = (text: string, styleIdx: number, customColor?: string, customBg?: string, customStroke?: string): string => {
  const t = text || 'WordArt';
  const lines = t.split('\n');
  const height = Math.max(300, lines.length * 110 + 40);
  const startY = height / 2 - ((lines.length - 1) * 110) / 2;

  const renderLines = (props: string, transform: string = '') => {
    return lines.map((line, idx) => {
      // Escape line characters if needed (for simplicity just put raw)
      const sanitizedLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const y = startY + idx * 110;
      return `<text x="50%" y="${y}" text-anchor="middle" dominant-baseline="middle" ${props} ${transform ? `transform="${transform}"` : ''}>${sanitizedLine}</text>`;
    }).join('\n');
  };

  let defs = '';
  let texts = '';

  const cFill = customColor || 'white';
  const cStroke = customStroke || 'black';

  if (styleIdx === 0) {
    texts = `
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="gray"`, 'translate(5, 5)')}
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="${cFill}" stroke="${cStroke}" stroke-width="3"`)}
    `;
  } else if (styleIdx === 1) {
    defs = `
      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${customColor || 'rgb(0,191,255)'};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${customStroke || 'rgb(0,0,139)'};stop-opacity:1" />
      </linearGradient>
    `;
    texts = `
      ${renderLines(`font-family="Impact, sans-serif" font-size="100" fill="gray"`, 'translate(4, 4)')}
      ${renderLines(`font-family="Impact, sans-serif" font-size="100" fill="${customColor ? cFill : 'url(#grad1)'}" stroke="white" stroke-width="2"`)}
    `;
  } else if (styleIdx === 2) {
    defs = `
      <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:red" />
        <stop offset="20%" style="stop-color:orange" />
        <stop offset="40%" style="stop-color:yellow" />
        <stop offset="60%" style="stop-color:green" />
        <stop offset="80%" style="stop-color:blue" />
        <stop offset="100%" style="stop-color:purple" />
      </linearGradient>
    `;
    texts = `
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="black"`, 'translate(3, 3)')}
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="${customColor ? cFill : 'url(#rainbow)'}" stroke="${cStroke}" stroke-width="3"`)}
    `;
  } else if (styleIdx === 3) {
    texts = `
      ${renderLines(`font-family="'Times New Roman', serif" font-size="100" font-style="italic" font-weight="bold" fill="#ddd"`, 'translate(6, 6)')}
      ${renderLines(`font-family="'Times New Roman', serif" font-size="100" font-style="italic" font-weight="bold" fill="${customColor || '#333'}"`)}
    `;
  } else if (styleIdx === 4) {
    defs = `
      <linearGradient id="yr" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:yellow;stop-opacity:1" />
        <stop offset="100%" style="stop-color:red;stop-opacity:1" />
      </linearGradient>
    `;
    texts = `
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="black"`, 'translate(5, 5)')}
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="${customColor ? cFill : 'url(#yr)'}" stroke="${cStroke}" stroke-width="3"`)}
    `;
  } else if (styleIdx === 5) {
    let shadows = '';
    for(let i=1; i<=10; i++) {
      shadows += renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="${customStroke || '#666'}"`, `translate(${i}, ${i})`) + '\n';
    }
    texts = `
      ${shadows}
      ${renderLines(`font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="${cFill}" stroke="black" stroke-width="3"`)}
    `;
  }

  const bgRect = customBg ? `<rect width="100%" height="100%" fill="${customBg}" />` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}">${bgRect}<defs>${defs}</defs>${texts}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const PAINT_COLORS = [
  '#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7'
];

const PhotoA4Generator: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [photos, _setPhotos] = useState<PhotoItem[]>([]);

  const updatePhotosState = (val: any) => {
    if (typeof val === 'function') {
      _setPhotos(prev => {
        const next = val(prev);
        if (!isUndoing) setHistory(pd => [...pd, next].slice(-20) as any);
        return next;
      });
    } else {
      _setPhotos(val);
      if (!isUndoing) setHistory(pd => [...pd, val].slice(-20) as any);
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      setIsUndoing(true);
      const prev = history[history.length - 2];
      setHistory(pd => pd.slice(0, -1));
      _setPhotos(prev);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPolaroid, setIsPolaroid] = useState(false);
  const [isRound, setIsRound] = useState(false);
  const [gapMm, setGapMm] = useState(0);
  const [marginMm, setMarginMm] = useState(3);
  const [pageSize, setPageSize] = useState({ name: 'A4', w: 210, h: 297 });
  const [history, setHistory] = useState([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<{ startX: number, startY: number, currX: number, currY: number, active: boolean } | null>(null);

  const [hasBorder, setHasBorder] = useState(true);
  const [borderColor, setBorderColor] = useState('#334155');
  const [borderWidthMm, setBorderWidthMm] = useState(0.5);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialPosX: 0, initialPosY: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, initialWidth: 0, initialHeight: 0 });
  const [isProcessingIA, setIsProcessingIA] = useState(false);

  // New states for clipboard and context menu
  const [clipboard, setClipboard] = useState<PhotoItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; targetId: string | null }>({ visible: false, x: 0, y: 0, targetId: null });

  const [isWordArtModalOpen, setIsWordArtModalOpen] = useState(false);
  const [wordArtText, setWordArtText] = useState('WordArt');
  const [wordArtStyle, setWordArtStyle] = useState(0);


  const firstSelected = photos.find(p => selectedIds.includes(p.id));
  const [topBarNode, setTopBarNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTopBarNode(document.getElementById('top-bar-actions'));
  }, []);

  const topBarContent = topBarNode ? createPortal(
    <div className="flex items-center gap-3 w-full animate-fade-in text-white/90">
      <button 
        onClick={handleUndo} 
        disabled={history.length <= 1} 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 shadow-inner shrink-0"
        title="Desfazer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
        Desfazer
      </button>

      {/* Divisor */}
      <div className="w-px h-6 bg-slate-800 shrink-0 mx-1"></div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 flex-1 overflow-x-auto min-w-0 hide-scrollbar pb-1 pt-1">
          {/* Ajustes Imagem */}
          <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700 shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0">Ajuste de Imagem</span>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-bold text-slate-300">Zoom</span>
              <input type="range" min="0.1" max="10" step="0.01" value={firstSelected?.zoom || 1} onChange={(e) => updatePhotosState((photos:any) => photos.map((p:any)=>selectedIds.includes(p.id)?{...p,zoom:Number(e.target.value)}:p))} className="w-16 accent-indigo-500" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-bold text-slate-300">Brilho</span>
              <input type="range" min="0" max="200" step="1" value={firstSelected?.brightness || 100} onChange={(e) => updatePhotosState((photos:any) => photos.map((p:any)=>selectedIds.includes(p.id)?{...p,brightness:Number(e.target.value)}:p))} className="w-16 accent-indigo-500" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-bold text-slate-300">Contra</span>
              <input type="range" min="0" max="200" step="1" value={firstSelected?.contrast || 100} onChange={(e) => updatePhotosState((photos:any) => photos.map((p:any)=>selectedIds.includes(p.id)?{...p,contrast:Number(e.target.value)}:p))} className="w-16 accent-indigo-500" />
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <span className="text-[9px] font-bold text-slate-300">Enquadr.</span>
              <select 
                value={firstSelected?.fitMode || "contain"} 
                onChange={(e) => updatePhotosState((photos:any) => photos.map((p:any)=>selectedIds.includes(p.id)?{...p,fitMode:e.target.value}:p))}
                className="bg-slate-900 border border-slate-700 text-[9px] text-white rounded px-1 py-0.5 outline-none font-bold"
              >
                <option value="cover">Crop</option>
                <option value="contain">Interno</option>
                <option value="fill">Distorcer</option>
              </select>
            </div>
          </div>

          {/* Borda */}
          <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700 shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0">Border</span>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <input type="checkbox" checked={hasBorder} onChange={(e)=>setHasBorder(e.target.checked)} className="accent-indigo-500" />
            </label>
            <div className="flex items-center gap-2 shrink-0 ml-1" style={{opacity: hasBorder ? 1 : 0.4, pointerEvents: hasBorder ? "auto" : "none"}}>
               <input type="number" min="0.1" max="10" step="0.1" value={borderWidthMm} onChange={(e) => setBorderWidthMm(Number(e.target.value))} className="w-10 bg-slate-900 border border-slate-700 text-center text-[10px] text-white rounded outline-none px-1" title="Espessura (mm)" />
               <input type="color" value={borderColor} onChange={e=>setBorderColor(e.target.value)} className="w-5 h-5 p-0 border-0 cursor-pointer rounded-sm bg-slate-900" />
            </div>
          </div>
        </div>
      )}
    </div>,
    topBarNode
  ) : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
    const mmToPxPreview = 2.8; // Escala visual aumentada

  const pages = useMemo(() => {
    const pagesList: PhotoItem[][] = [[]];
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
      const pH = isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : (isRound ? photo.widthMm : photo.heightMm);

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
  }, [photos, orientation, gapMm, isPolaroid, pageSize, marginMm]);

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
          await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
          const src = canvas.toDataURL('image/jpeg', 0.9);
          const aspect = canvas.width / canvas.height;
          let widthMm = 80;
          let heightMm = 100;

          // Ajusta a proporção do PDF para evitar distorções ou cortes
          if (aspect > 1) {
            widthMm = 80;
            heightMm = Math.round(80 / aspect);
          } else {
            heightMm = 100;
            widthMm = Math.round(100 * aspect);
          }

          newPhotos.push({
            id: Math.random().toString(36).substr(2, 9),
            src,
            zoom: 1.0,
            rotation: 0,
            posX: 0,
            posY: 0,
            widthMm,
            heightMm,
            brightness: 100,
            contrast: 100,
            fitMode: 'contain'
          });
        }
      }
      updatePhotosState(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      alert("Erro ao processar o arquivo PDF.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const processFile = (file: File) => {
    if (file.type === 'application/pdf') {
      processPdfFile(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const id = Math.random().toString(36).substr(2, 9);
        const src = event.target?.result as string;
        if (src) {
          const img = new Image();
          img.onload = () => {
            const aspect = img.width / img.height;
            let widthMm = 80;
            let heightMm = 100;

            // Ajusta a largura ou altura proporcionalmente para manter a proporção original e evitar cortes
            if (aspect > 1) {
              // Paisagem (horizontal)
              widthMm = 80;
              heightMm = Math.round(80 / aspect);
            } else {
              // Retrato (vertical)
              heightMm = 100;
              widthMm = Math.round(100 * aspect);
            }

            updatePhotosState(prev => [...prev, {
              id,
              src,
              zoom: 1.0,
              rotation: 0,
              posX: 0,
              posY: 0,
              widthMm,
              heightMm,
              brightness: 100,
              contrast: 100,
              fitMode: 'contain'
            }]);
          };
          img.src = src;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWordArt = () => {
    if (!wordArtText.trim()) return;
    const src = getWordArtSVG(wordArtText, wordArtStyle);
    const id = Math.random().toString(36).substr(2, 9);
    updatePhotosState(prev => [...prev, {
      id,
      src,
      zoom: 1.0,
      rotation: 0,
      posX: 0,
      posY: 0,
      widthMm: 80,
      heightMm: 30,
      brightness: 100,
      contrast: 100,
      fitMode: 'contain',
      isWordArt: true,
      wordArtText,
      wordArtStyle
    }]);
    setIsWordArtModalOpen(false);
  };

  const handleAddText = () => {
    const id = Math.random().toString(36).substr(2, 9);
    updatePhotosState(prev => [...prev, {
      id,
      src: '', // We don't use img src for this text node
      zoom: 1.0,
      rotation: 0,
      posX: 0,
      posY: 0,
      widthMm: 80,
      heightMm: 30, // Initially smaller height
      brightness: 100,
      contrast: 100,
      isTextNode: true,
      textContent: 'Texto Livre',
      fontFamily: 'Inter',
      fontSize: 24,
      textColor: '#000000'
    }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => processFile(file));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p.id));
    }
  };

  // Free Crop visually handled per photo.
  // We use handleCropMouseDown, Move, Up instead of global window events to avoid global coordinate issues.

  const applyCropFromBox = (photoId: string, box: { startX: number, startY: number, currX: number, currY: number }, rect: DOMRect) => {
      const px = Math.min(box.startX, box.currX);
      const py = Math.min(box.startY, box.currY);
      const pw = Math.abs(box.currX - box.startX);
      const ph = Math.abs(box.currY - box.startY);
      
      if (pw < 10 || ph < 10) {
        setActiveCropId(null);
        setCropBox(null);
        return;
      }
      
      const photo = photos.find(p => p.id === photoId);
      if (photo && photo.src.startsWith('data:image')) {
         const img = new Image();
         img.onload = () => {
            const dpi = 3;
            const canvas = document.createElement('canvas');
            canvas.width = rect.width * dpi;
            canvas.height = rect.height * dpi;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            let drawW = img.width;
            let drawH = img.height;
            let drawX = 0;
            let drawY = 0;
            
            const imgRatio = img.width / img.height;
            const rectRatio = rect.width / rect.height;
            const fitMode = photo.fitMode || 'contain';
            
            if (fitMode === 'cover') {
               if (imgRatio > rectRatio) {
                   drawH = rect.height;
                   drawW = img.width * (rect.height / img.height);
               } else {
                   drawW = rect.width;
                   drawH = img.height * (rect.width / img.width);
               }
            } else if (fitMode === 'fill') {
               drawW = rect.width;
               drawH = rect.height;
            } else {
               if (imgRatio > rectRatio) {
                   drawW = rect.width;
                   drawH = img.height * (rect.width / img.width);
               } else {
                   drawH = rect.height;
                   drawW = img.width * (rect.height / img.height);
               }
            }
            
            drawX = (rect.width - drawW) / 2;
            drawY = (rect.height - drawH) / 2;
            
            ctx.save();
            ctx.scale(dpi, dpi);
            ctx.translate(rect.width/2, rect.height/2);
            ctx.translate(photo.posX || 0, photo.posY || 0);
            ctx.rotate((photo.rotation || 0) * Math.PI / 180);
            ctx.scale(photo.zoom || 1, photo.zoom || 1);
            ctx.translate(-rect.width/2, -rect.height/2);
            
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
            
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = pw * dpi;
            finalCanvas.height = ph * dpi;
            const finalCtx = finalCanvas.getContext('2d');
            if (!finalCtx) return;
            
            finalCtx.drawImage(canvas, px * dpi, py * dpi, pw * dpi, ph * dpi, 0, 0, pw * dpi, ph * dpi);
            const newDataUrl = finalCanvas.toDataURL('image/png', 1.0);
            
            updatePhotosState((currentPhotos: any) => 
              currentPhotos.map((p: any) => p.id === photoId ? { 
                ...p, 
                src: newDataUrl, 
                widthMm: Math.max(10, p.widthMm * (pw / rect.width)), 
                heightMm: Math.max(10, p.heightMm * (ph / rect.height)),
                zoom: 1, posX: 0, posY: 0, rotation: 0, fitMode: 'cover'
              } : p)
            );
            setActiveCropId(null);
            setCropBox(null);
         };
         img.src = photo.src;
      }
  };


  // Keyboard Shortcuts & Context Menu Handlers
  // PWA File Reception
  useEffect(() => {
    const processGlobalFiles = () => {
      const files = (window as any).__pwaFiles as File[];
      if (files && files.length > 0) {
        files.forEach(file => processFile(file));
        (window as any).__pwaFiles = []; // clear
      }
    };
    
    // Check initially if already launched
    processGlobalFiles();
    
    // Listen for future launches
    window.addEventListener('pwa-files-received', processGlobalFiles);
    return () => window.removeEventListener('pwa-files-received', processGlobalFiles);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          toggleSelectAll();
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          if (selectedIds.length > 0) {
             setClipboard(photos.filter(p => selectedIds.includes(p.id)));
             navigator.clipboard.writeText('anix-internal-copy').catch(() => {});
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
           updatePhotosState(current => current.filter(p => !selectedIds.includes(p.id)));
           setSelectedIds([]);
        }
      } else if (e.key === 'Escape') {
        setSelectedIds([]);
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    const handleSystemPaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const items = e.clipboardData?.items;
      let hasFiles = false;
      
      if (items) {
        Array.from(items).forEach(item => {
          if (item.type.indexOf('image/') !== -1 || item.type === 'application/pdf') {
            const file = item.getAsFile();
            if (file) {
              processFile(file);
              hasFiles = true;
            }
          }
        });
      }

      if (!hasFiles && clipboard.length > 0) {
        const newItems = clipboard.map(p => ({
          ...p,
          id: Math.random().toString(36).substr(2, 9)
        }));
        updatePhotosState(prev => [...prev, ...newItems]);
        setSelectedIds(newItems.map(p => p.id));
      }
    };

    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleSystemPaste);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleSystemPaste);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [photos, selectedIds, clipboard, contextMenu.visible]);

  // Intercepta o evento 'wheel' com { passive: false } no workspace para evitar o scroll nativo da página ao dar zoom livre
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const photoEl = target.closest('[id^="photo-"]');
      if (photoEl) {
        const id = photoEl.id.replace('photo-', '');
        if (selectedIds.includes(id)) {
          e.preventDefault();
          e.stopPropagation();

          const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
          updatePhotosState((currentPhotos: any) => 
            currentPhotos.map((p: any) => p.id === id ? { ...p, zoom: Math.max(0.1, Math.min(10, (p.zoom || 1) + zoomDelta)) } : p)
          );
        }
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
    };
  }, [selectedIds]);

  const handlePhotoMouseDown = (e: React.MouseEvent, photoId: string) => {
    if (e.button === 2) {
      e.preventDefault();
      if (!selectedIds.includes(photoId)) {
        setSelectedIds([photoId]);
      }
    } else {
      const photo = photos.find(p => p.id === photoId);
      if (photo) handleDragStart(e, photo);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, photoId?: string) => {
    e.preventDefault();
    if (photoId && !selectedIds.includes(photoId)) {
      setSelectedIds([photoId]);
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: photoId || null
    });
  };

  const updatePhotos = (updates: Partial<PhotoItem>) => {
    updatePhotosState(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, ...updates } : p));
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
      
      updatePhotosState(updatedPhotos);
      if (hasError) alert("Algumas imagens não puderam ser processadas.");
    } catch (err) {
      console.error(err);
      alert("Falha ao processar remoção de fundo com IA.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const applyProportionalCrop = () => {
    if (selectedIds.length === 0) return;
    updatePhotosState(prev => prev.map(photo => {
      if (!selectedIds.includes(photo.id)) return photo;
      return {
        ...photo,
        zoom: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        fitMode: 'cover'
      };
    }));
  };

  const applyFreeCrop = () => {
    if (selectedIds.length === 0) return;
    updatePhotosState(prev => prev.map(photo => {
      if (!selectedIds.includes(photo.id)) return photo;
      return {
        ...photo,
        zoom: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        fitMode: 'contain'
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
    updatePhotosState(prev => [...prev, ...newItems]);
  };

  const removeSelected = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (selectedIds.length === 0) return;
    updatePhotosState(current => current.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
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
    updatePhotosState(prev => prev.map(p => p.id === draggingId ? { ...p, posX: dragStart.initialPosX + deltaX, posY: dragStart.initialPosY + deltaY } : p));
  };

  const handleGlobalEnd = () => setDraggingId(null);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, photo: PhotoItem) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setResizingId(photo.id);
    setResizeStart({ x: clientX, y: clientY, initialWidth: photo.widthMm, initialHeight: photo.heightMm });
  };

  const handleGlobalResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!resizingId) return;
    const clientX = (e instanceof MouseEvent) ? e.clientX : (e as TouchEvent).touches[0].clientX;
    const clientY = (e instanceof MouseEvent) ? e.clientY : (e as TouchEvent).touches[0].clientY;
    const deltaX = (clientX - resizeStart.x) / mmToPxPreview;
    const deltaY = (clientY - resizeStart.y) / mmToPxPreview;
    
    // We update widthMm / heightMm
    updatePhotosState(prev => prev.map(p => 
      p.id === resizingId 
        ? { ...p, widthMm: Math.max(10, resizeStart.initialWidth + deltaX), heightMm: Math.max(10, resizeStart.initialHeight + deltaY) } 
        : p
    ));
  };

  const handleGlobalResizeEnd = () => setResizingId(null);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchmove', handleGlobalMove);
      window.addEventListener('touchend', handleGlobalEnd);
    }
    if (resizingId) {
      window.addEventListener('mousemove', handleGlobalResizeMove);
      window.addEventListener('mouseup', handleGlobalResizeEnd);
      window.addEventListener('touchmove', handleGlobalResizeMove);
      window.addEventListener('touchend', handleGlobalResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('mousemove', handleGlobalResizeMove);
      window.removeEventListener('mouseup', handleGlobalResizeEnd);
      window.removeEventListener('touchmove', handleGlobalResizeMove);
      window.removeEventListener('touchend', handleGlobalResizeEnd);
    };
  }, [draggingId, dragStart, resizingId, resizeStart]);

  const saveAsPNG = async (pageIndex: number) => {
    const dpiFactor = 11.811; // 300 DPI
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (orientation === 'portrait' ? pageSize.w : pageSize.h) * dpiFactor;
    const h = (orientation === 'portrait' ? pageSize.h : pageSize.w) * dpiFactor;
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h);

    const pagePhotos = pages[pageIndex];
    let currentX = marginMm * dpiFactor;
    let currentY = marginMm * dpiFactor;
    let currentRowHeight = 0;

    for (const photo of pagePhotos) {
      const pW = photo.widthMm * dpiFactor;
      const pH = (isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : (isRound ? photo.widthMm : photo.heightMm)) * dpiFactor;
      if (currentX + pW > (w - marginMm * dpiFactor + 1)) { currentX = marginMm * dpiFactor; currentY += currentRowHeight + (gapMm * dpiFactor); currentRowHeight = 0; }
      const img = new Image(); img.src = photo.src;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      ctx.save();
      ctx.translate(currentX, currentY);

      if (isRound) {
        ctx.beginPath();
        ctx.arc(pW/2, pH/2, Math.min(pW, pH)/2, 0, Math.PI * 2);
        ctx.clip();
      }

      if (isPolaroid) {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, pW, pH);
        ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.4 * dpiFactor; ctx.strokeRect(0, 0, pW, pH);
      } else if (hasBorder) {
        if (isRound) {
          ctx.beginPath();
          ctx.arc(pW/2, pH/2, Math.min(pW, pH)/2, 0, Math.PI * 2);
          ctx.lineWidth = borderWidthMm * dpiFactor;
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        } else {
          ctx.strokeStyle = borderColor; ctx.lineWidth = borderWidthMm * dpiFactor; ctx.strokeRect(0, 0, pW, pH);
        }
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
      ctx.scale(photo.zoom, photo.zoom);
      
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
    const height = (isPolaroid ? photo.widthMm * POLAROID_HEIGHT_RATIO : (isRound ? photo.widthMm : photo.heightMm)) * factor;
    return (
      <div key={photo.id} id={"photo-" + photo.id}
        onMouseDown={!isPrint && activeCropId !== photo.id ? (e) => handlePhotoMouseDown(e, photo.id) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onContextMenu={(e) => { e.preventDefault(); if (!activeCropId) handleContextMenu(e, photo.id); }}
        onDoubleClick={!isPrint ? () => {
          updatePhotosState((currentPhotos: any) => 
            currentPhotos.map((p: any) => p.id === photo.id ? { ...p, zoom: 1.0, posX: 0, posY: 0 } : p)
          );
        } : undefined}
        style={{ 
          width: `${width}${unit}`, 
          height: `${height}${unit}`, 
          position: photo.isTextNode ? 'absolute' : 'relative', 
          transform: photo.isTextNode ? `translate(${photo.posX || 0}px, ${photo.posY || 0}px)` : 'none',
          border: isPolaroid ? `${0.4 * factor}${unit} solid #cbd5e1` : (hasBorder && !isRound && !photo.isTextNode ? `${borderWidthMm * factor}${unit} solid ${borderColor}` : 'none'), 
          boxSizing: 'border-box', 
          overflow: photo.isTextNode ? 'visible' : 'hidden', 
          backgroundColor: photo.isTextNode ? 'transparent' : (isPolaroid ? 'white' : '#ffffff'), 
          boxShadow: isPolaroid && !isPrint ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none',
          borderRadius: isRound && !photo.isTextNode ? '50%' : '0',
          zIndex: photo.isTextNode ? 30 : 10
        }}
        className={`transition-all cursor-move select-none ${!isPrint && selectedIds.includes(photo.id) ? 'ring-4 ring-blue-500 ring-inset shadow-2xl scale-[1.02]' : ''}`}>
        
        {photo.isWordArt && <div className="absolute inset-0 z-0 bg-[#ffffff]"></div>}
        
        {photo.isTextNode ? (
           <div className="absolute inset-0 z-10 flex items-center justify-center p-1 text-center pointer-events-none" style={{ background: 'transparent', transform: `scale(${photo.zoom || 1}) rotate(${photo.rotation || 0}deg)`, transformOrigin: 'center' }}>
             <span style={{ fontFamily: photo.fontFamily || 'Inter', fontSize: `${(photo.fontSize || 24) * factor}px`, color: photo.textColor || '#000000', whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>{photo.textContent}</span>
           </div>
        ) : photo.src.startsWith('<svg') ? (
          <div dangerouslySetInnerHTML={{ __html: photo.src }} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" style={{ transform: `scale(${photo.zoom || 1}) translate(${(photo.posX || 0)}px, ${(photo.posY || 0)}px) rotate(${photo.rotation || 0}deg)`, transformOrigin: 'center' }} />
        ) : (
           <img 
             src={photo.src} 
             alt="photo" 
             draggable={false}
             className="absolute inset-0 w-full h-full pointer-events-none z-10" 
             style={{ 
               objectFit: photo.fitMode || 'cover', 
               transform: `scale(${photo.zoom || 1}) translate(${(photo.posX || 0)}px, ${(photo.posY || 0)}px) rotate(${photo.rotation || 0}deg)`,
               transformOrigin: 'center',
               filter: `brightness(${photo.brightness ?? 100}%) contrast(${photo.contrast ?? 100}%)`
             }} 
           />
        )}

        {isPolaroid && (
           <div className="absolute top-0 w-full h-[83%] z-20" style={{ border: `${0.4 * factor}${unit} solid #cbd5e1`, boxSizing: 'border-box', borderBottom: 'none' }} />
        )}

        {/* NEW CROP OVERLAY */}
        {activeCropId === photo.id && (
           <div 
             style={{ 
               position: 'absolute', inset: 0, zIndex: 9999, cursor: 'crosshair', backgroundColor: 'rgba(230, 200, 200, 0.2)' 
             }} 
             onMouseDown={(e) => {
               e.stopPropagation();
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const y = e.clientY - rect.top;
               setCropBox({ startX: x, startY: y, currX: x, currY: y, active: true });
             }}
             onMouseMove={(e) => {
               if (cropBox && cropBox.active) {
                 e.stopPropagation();
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const y = e.clientY - rect.top;
                 setCropBox(p => p ? { ...p, currX: x, currY: y } : null);
               }
             }}
             onMouseUp={(e) => {
               e.stopPropagation();
               if (cropBox && cropBox.active) {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const y = e.clientY - rect.top;
                 applyCropFromBox(photo.id, { ...cropBox, currX: x, currY: y }, rect);
               }
             }}
             onMouseLeave={(e) => {
               if (cropBox && cropBox.active) {
                 const rect = e.currentTarget.getBoundingClientRect();
                 applyCropFromBox(photo.id, cropBox, rect);
               }
             }}
           >
             {cropBox && cropBox.active && (
                <div style={{
                  position: 'absolute',
                  left: Math.min(cropBox.startX, cropBox.currX),
                  top: Math.min(cropBox.startY, cropBox.currY),
                  width: Math.abs(cropBox.currX - cropBox.startX),
                  height: Math.abs(cropBox.currY - cropBox.startY),
                  border: '1.5px dashed red',
                  backgroundColor: 'rgba(255, 230, 220, 0.4)',
                  boxShadow: '0 0 0 9999px rgba(255, 255, 255, 0.4)'
                }} />
             )}
           </div>
        )}

         {/* DICA DE ZOOM LIVRE (SCROLL) */}
         {!isPrint && selectedIds.includes(photo.id) && !photo.isTextNode && (
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-[8px] text-white font-extrabold px-1.5 py-0.5 rounded pointer-events-none z-50 shadow select-none uppercase tracking-wider animate-pulse">
              🖱️ Scroll = Zoom Livre | dblclick = Reset
            </div>
         )}

         {/* RESIZE HANDLE */}
         {!isPrint && selectedIds.includes(photo.id) && !photo.isTextNode && (
            <div 
              onMouseDown={(e) => handleResizeStart(e, photo)}
              onTouchStart={(e) => handleResizeStart(e, photo)}
              style={{
                position: 'absolute',
                bottom: '3px',
                right: '3px',
                width: '14px',
                height: '14px',
                backgroundColor: '#3b82f6',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                cursor: 'se-resize',
                zIndex: 50,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              className="hover:scale-125 transition-transform"
              title="Redimensionamento Livre (Arraste para redimensionar)"
            />
         )}
      </div>
    );
  };

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-200 font-sans text-slate-900 border-t border-slate-300">
      
      {/* SIDEBAR ESQUERDA */}
      <div 
        className={`bg-white border-r border-slate-200 flex flex-col z-20 shadow-2xl transition-all duration-300 ease-in-out no-print ${isSidebarExpanded ? 'w-64' : 'w-12 bg-slate-50'}`}
      >
        <div className="p-4 relative">
           <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${!isSidebarExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           </button>
           {isSidebarExpanded ? (
             <div className="w-full text-left pr-6">
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Fotos <span className="text-blue-600">A4</span></h2>
               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Estúdio Pro</div>
             </div>
           ) : (
             <div className="text-blue-600 font-black text-xs h-[40px] flex items-center justify-center pt-8 mb-[-10px]">A4</div>
           )}
        </div>

        <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 pt-0 flex flex-col gap-4 ${!isSidebarExpanded ? 'hidden' : ''}`}>
           {topBarContent}

           {/* ACTION BUTTONS GRID */}
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-all shadow-blue-500/20 w-full group">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1.5 opacity-90 group-hover:opacity-100 group-active:scale-95 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 <span className="text-[9px] font-black uppercase tracking-wider">Abrir</span>
              </button>
              <button onClick={() => handleAddText()} className="flex flex-col items-center justify-center p-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all shadow-teal-500/20 w-full group">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1.5 opacity-90 group-hover:opacity-100 group-active:scale-95 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1-12a2 2 0 012 2v1m-3-3l3 3m-3-3L15 6m3-3v1m-3 3l3 3" /></svg>
                 <span className="text-[9px] font-black uppercase tracking-wider">Texto Livre</span>
              </button>
              <button onClick={() => setIsWordArtModalOpen(true)} className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all shadow-amber-500/20 w-full group">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1.5 opacity-90 group-hover:opacity-100 group-active:scale-95 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                 <span className="text-[9px] font-black uppercase tracking-wider">WordArt</span>
              </button>
              <button onClick={() => window.print()} className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-400 hover:bg-indigo-500 text-white shadow-sm transition-all shadow-indigo-400/20 w-full group">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1.5 opacity-90 group-hover:opacity-100 group-active:scale-95 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 <span className="text-[9px] font-black uppercase tracking-wider">Imprimir</span>
              </button>
           </div>
           
           <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileUpload} />

           {/* LEFT SIDEBAR TOOLBAR */}
           <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
               {/* GROUP: DIMENSÃO & CORTE */}
               <div className="toolbar-group">
                  <div className="toolbar-group-title">Medidas (mm)</div>
                  <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 justify-between">
                        <label className="text-[8px] font-bold text-slate-600 uppercase">Largura (mm)</label>
                        <input type="number" disabled={selectedIds.length === 0 || isPolaroid} value={firstSelected?.widthMm || 100} onChange={(e) => updatePhotos({ widthMm: Number(e.target.value) })} className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-center text-blue-700 disabled:opacity-50" />
                     </div>
                     <div className="flex items-center gap-2 justify-between">
                        <label className="text-[8px] font-bold text-slate-600 uppercase">Altura (mm)</label>
                        <input type="number" disabled={selectedIds.length === 0 || isPolaroid} value={firstSelected?.heightMm || 100} onChange={(e) => updatePhotos({ heightMm: Number(e.target.value) })} className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-center text-blue-700 disabled:opacity-50" />
                     </div>
                     {!isPolaroid && selectedIds.length > 0 && (
                        <div className="grid grid-cols-4 gap-1 mt-1">
                           {[ {l:"A6", w:105, h:148}, {l:"A5", w:148, h:210}, {l:"A4", w:210, h:297}, {l:"A3", w:297, h:420} ].map(size => (
                             <button 
                               key={size.l} 
                               onClick={() => updatePhotos({ widthMm: size.w, heightMm: size.h })}
                               className="text-[9px] bg-white border border-slate-200 text-slate-500 py-1 rounded hover:bg-slate-100 font-bold"
                             >
                               {size.l}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* GROUP: PÁGINA */}
               <div className="toolbar-group">
                 <div className="toolbar-group-title">Página & Layout</div>
                 <div className="grid grid-cols-2 gap-1.5">
                     <button onClick={() => setOrientation(orientation === "portrait" ? "landscape" : "portrait")} className="bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2 py-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold text-slate-700 col-span-2">
                       {orientation === "portrait" ? "📄 Página: Retrato" : "📂 Página: Paisagem"}
                     </button>
                     <button onClick={() => setIsPolaroid(!isPolaroid)} className={`px-2 py-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-colors ${isPolaroid ? "bg-indigo-100 border-indigo-300 text-indigo-800 shadow-inner" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                       📸 Polaroid
                     </button>
                     <button onClick={() => setIsRound(!isRound)} className={`px-2 py-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-colors ${isRound ? "bg-orange-100 border-orange-300 text-orange-800 shadow-inner" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                       ⭕ Redonda
                     </button>
                     <div className="col-span-2 flex flex-col gap-1.5 border border-slate-200 rounded-lg p-1.5 bg-slate-50">
                       <div className="flex items-center gap-2 justify-between">
                         <label className="text-[8px] font-bold text-slate-600 uppercase">Espaço (mm)</label>
                         <input type="number" min="0" max="50" value={gapMm} onChange={(e)=>setGapMm(Number(e.target.value))} className="w-12 bg-white border border-slate-200 rounded px-1 text-center font-bold text-slate-800 text-[10px]" />
                       </div>
                       <div className="flex items-center gap-2 justify-between">
                         <label className="text-[8px] font-bold text-slate-600 uppercase">Margem (mm)</label>
                         <input type="number" min="0" max="50" value={marginMm} onChange={(e)=>setMarginMm(Number(e.target.value))} className="w-12 bg-white border border-slate-200 rounded px-1 text-center font-bold text-slate-800 text-[10px]" />
                       </div>
                     </div>
                 </div>
               </div>

               {/* GROUP: AÇÕES */}
               <div className="toolbar-group">
                 <div className="toolbar-group-title">Ações ({selectedIds.length})</div>
                 <div className="flex flex-col gap-1.5">
                    <button onClick={handleRemoveBackground} disabled={selectedIds.length === 0 || isProcessingIA} className="w-full bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center disabled:opacity-40 transition-colors relative">
                       {isProcessingIA && <span className="absolute inset-0 bg-white/50 animate-pulse rounded-xl"></span>}
                       <span className="text-sm mr-2 z-10">✨</span>
                       <span className="z-10">{isProcessingIA ? "PROCESSANDO..." : "REMOVER FUNDO (IA)"}</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                       <button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="bg-slate-800 text-white hover:bg-black py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-40 transition-colors">
                         👯<span className="ml-1">Duplicar</span>
                       </button>
                       <button onClick={removeSelected} disabled={selectedIds.length === 0} className="bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-40 transition-colors">
                         🗑️<span className="ml-1">Excluir</span>
                       </button>
                    </div>
                 </div>
               </div>

               {/* GROUP: AJUSTES */}
               <div className="toolbar-group">
                 <div className="toolbar-group-title">Ajustes & Filtros</div>
                 <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase flex justify-between">
                        <span>Brilho</span>
                        <span>{firstSelected?.brightness ?? 100}%</span>
                      </label>
                      <input type="range" min="0" max="200" disabled={selectedIds.length === 0} value={firstSelected?.brightness ?? 100} onChange={(e) => updatePhotos({ brightness: Number(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase flex justify-between">
                        <span>Contraste</span>
                        <span>{firstSelected?.contrast ?? 100}%</span>
                      </label>
                      <input type="range" min="0" max="200" disabled={selectedIds.length === 0} value={firstSelected?.contrast ?? 100} onChange={(e) => updatePhotos({ contrast: Number(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                 </div>
               </div>

               {/* WORDART PANEL */}
               {firstSelected?.isWordArt && (
                 <div className="toolbar-group">
                    <div className="toolbar-group-title text-amber-600">Config do WordArt</div>
                    <div className="flex flex-col gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200">
                       <div className="flex flex-col gap-1 w-full">
                          <label className="text-[9px] font-bold text-amber-800 uppercase">Texto</label>
                          <textarea rows={2} value={firstSelected.wordArtText || ""} onChange={(e) => {
                            const newText = e.target.value;
                            updatePhotos({ 
                              wordArtText: newText, 
                              src: getWordArtSVG(newText, firstSelected.wordArtStyle || 0, firstSelected.wordArtColor, firstSelected.wordArtBg, firstSelected.wordArtStroke) 
                            });
                          }} className="w-full text-[11px] p-1.5 border border-amber-300 rounded resize-none outline-none focus:ring-1 ring-amber-500 font-bold text-amber-900" />
                       </div>
                       <div className="flex flex-col gap-1 w-full">
                          <label className="text-[9px] font-bold text-amber-800 uppercase">Estilo</label>
                          <select value={firstSelected.wordArtStyle || 0} onChange={(e) => {
                            const s = parseInt(e.target.value);
                            updatePhotos({ wordArtStyle: s, src: getWordArtSVG(firstSelected.wordArtText || "", s, firstSelected.wordArtColor, firstSelected.wordArtBg, firstSelected.wordArtStroke) });
                          }} className="w-full text-[11px] h-8 px-1.5 border border-amber-300 bg-white rounded outline-none font-bold text-amber-900">
                            <option value={0}>Clássico</option>
                            <option value={1}>Impacto</option>
                            <option value={2}>Arco-íris</option>
                            <option value={3}>Elegante</option>
                            <option value={4}>Fogo</option>
                            <option value={5}>Sombra 3D</option>
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-2 mt-1">
                           <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-bold text-amber-800 uppercase" title="Cor Principal">Cor Texto</label>
                              <input type="color" value={firstSelected.wordArtColor || "#ffffff"} onChange={(e) => {
                                const c = e.target.value;
                                updatePhotos({ wordArtColor: c, src: getWordArtSVG(firstSelected.wordArtText || "", firstSelected.wordArtStyle || 0, c, firstSelected.wordArtBg, firstSelected.wordArtStroke) });
                              }} className="w-full h-8 cursor-pointer bg-white border border-amber-300 p-0.5 rounded" />
                           </div>
                           <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-bold text-amber-800 uppercase" title="Borda/Contorno">Contorno</label>
                              <input type="color" value={firstSelected.wordArtStroke || "#000000"} onChange={(e) => {
                                const c = e.target.value;
                                updatePhotos({ wordArtStroke: c, src: getWordArtSVG(firstSelected.wordArtText || "", firstSelected.wordArtStyle || 0, firstSelected.wordArtColor, firstSelected.wordArtBg, c) });
                              }} className="w-full h-8 cursor-pointer bg-white border border-amber-300 p-0.5 rounded" />
                           </div>
                       </div>
                    </div>
                 </div>
               )}
               {/* TEXT PANEL */}
               {firstSelected?.isTextNode && (
                 <div className="toolbar-group">
                    <div className="toolbar-group-title text-teal-600">Formatação de Texto</div>
                    <div className="flex flex-col gap-2 bg-teal-50/50 p-2 rounded-lg border border-teal-200">
                       <div className="flex flex-col gap-1 w-full">
                          <label className="text-[9px] font-bold text-teal-800 uppercase">Texto</label>
                          <textarea rows={2} value={firstSelected.textContent || ""} onChange={(e) => {
                            updatePhotos({ textContent: e.target.value });
                          }} className="w-full text-[11px] p-1.5 border border-teal-300 rounded resize-none outline-none focus:ring-1 ring-teal-500 font-medium text-teal-900" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 mt-1">
                           <div className="flex flex-col gap-1 w-full">
                              <label className="text-[9px] font-bold text-teal-800 uppercase">Fonte</label>
                              <select value={firstSelected.fontFamily || 'Inter'} onChange={(e) => updatePhotos({ fontFamily: e.target.value })} className="w-full text-[10px] h-8 px-1.5 border border-teal-300 bg-white rounded outline-none font-bold text-teal-900">
                                <option value="Inter">Inter</option>
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New</option>
                                <option value="Courier New">Courier</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Impact">Impact</option>
                                <option value="Comic Sans MS">Comic Sans</option>
                              </select>
                           </div>
                           <div className="flex flex-col gap-1 w-full">
                              <label className="text-[9px] font-bold text-teal-800 uppercase">Tamanho</label>
                              <input type="number" min="8" max="200" value={firstSelected.fontSize || 24} onChange={(e) => updatePhotos({ fontSize: Number(e.target.value) })} className="w-full text-[11px] h-8 px-1.5 border border-teal-300 bg-white rounded outline-none font-bold text-teal-900" />
                           </div>
                           <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-[8px] font-bold text-teal-800 uppercase" title="Cor Texto">Cor do Texto</label>
                              <input type="color" value={firstSelected.textColor || "#000000"} onChange={(e) => updatePhotos({ textColor: e.target.value })} className="w-full h-8 cursor-pointer bg-white border border-teal-300 p-0.5 rounded" />
                           </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
         </div>
      </div>
      {/* WORKSPACE PREVIEW AREA */}
      <div 
        ref={workspaceRef}
        className="flex-1 flex flex-col gap-6 no-print overflow-y-auto custom-scrollbar p-6 bg-slate-100/50"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            handleContextMenu(e);
          }
        }}
      >
        <div className="sticky top-0 z-30 w-full flex justify-center pointer-events-none">
           <div className="bg-slate-900/80 backdrop-blur text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/10 pointer-events-auto flex items-center gap-4">
              <span>Arraste e gire para enquadrar ({photos.length} fotos)</span>
              {photos.length > 0 && (
                <button onClick={toggleSelectAll} className={`px-3 py-1 rounded-lg border transition-all ${selectedIds.length === photos.length ? 'bg-blue-600 border-blue-500' : 'bg-white/20 border-white/20 hover:bg-white/30'}`}>
                  {selectedIds.length === photos.length ? 'DESELECIONAR' : 'SELECIONAR TODAS'}
                </button>
              )}
           </div>
        </div>

        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className="flex flex-col items-center gap-3">
            <div className="flex justify-between items-center w-full max-w-[653px] px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {pageIndex + 1} de {pages.length}</span>
              <button onClick={() => saveAsPNG(pageIndex)} className="text-indigo-600 font-black text-[9px] uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm hover:shadow hover:bg-indigo-50 transition-all flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Exportar PNG
              </button>
            </div>
            <div 
              style={{ width: `${(orientation === 'portrait' ? pageSize.w : pageSize.h) * mmToPxPreview}px`, minHeight: `${(orientation === 'portrait' ? pageSize.h : pageSize.w) * mmToPxPreview}px`, backgroundColor: 'white', padding: `${marginMm * mmToPxPreview}px`, display: 'flex', flexWrap: 'wrap', gap: `${gapMm * mmToPxPreview}px`, justifyContent: 'flex-start', alignContent: 'flex-start', flexShrink: 0 }} 
              className="shadow-2xl relative transition-all duration-300 border border-slate-200 checkerboard ring-1 ring-slate-900/5 mx-auto"
            >
              {/* Margem de segurança visual */}
              <div style={{ position: 'absolute', top: `${marginMm * mmToPxPreview}px`, left: `${marginMm * mmToPxPreview}px`, right: `${marginMm * mmToPxPreview}px`, bottom: `${marginMm * mmToPxPreview}px`, border: '1px dashed rgba(59, 130, 246, 0.4)', pointerEvents: 'none', zIndex: 10 }}></div>
              {page.map(photo => renderPhotoContent(photo, false))}
            </div>
          </div>
        ))}

        {photos.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-300 italic font-black uppercase tracking-[0.2em]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
              Use a barra superior para adicionar fotos
           </div>
        )}
      </div>

      <div className="hidden print-area">
        {pages.map((page, pageIndex) => (
          <div 
            key={pageIndex} 
            className="print-page"
            style={{
              width: `${orientation === 'portrait' ? pageSize.w : pageSize.h}mm`,
              height: `${orientation === 'portrait' ? pageSize.h : pageSize.w}mm`,
              padding: `${marginMm}mm`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: `${gapMm}mm`,
              justifyContent: 'flex-start',
              alignContent: 'flex-start',
              boxSizing: 'border-box',
              pageBreakAfter: 'always',
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}
          >
            {page.map(photo => renderPhotoContent(photo, true))}
          </div>
        ))}
      </div>

      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-white rounded flex flex-col shadow-2xl border border-slate-200 w-64 overflow-hidden py-1 animate-fade-in"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 256), 
            top: Math.min(contextMenu.y, window.innerHeight - 300)
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button 
            onClick={() => { toggleSelectAll(); setContextMenu(prev => ({ ...prev, visible: false })); }} 
            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
            Selecionar todos
          </button>
          <button 
            onClick={() => { setSelectedIds([]); setContextMenu(prev => ({ ...prev, visible: false })); }} 
            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
            Desfazer Seleção
          </button>
          <div className="h-px bg-slate-100 my-1 mx-2"></div>
          <button 
            onClick={() => { 
              if (selectedIds.length > 0) setClipboard(photos.filter(p => selectedIds.includes(p.id))); 
              setContextMenu(prev => ({ ...prev, visible: false }));
            }} 
            disabled={selectedIds.length === 0}
            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Copiar
          </button>
          <button 
            onClick={() => { 
                if (clipboard.length > 0) {
                    const newItems = clipboard.map(p => ({...p, id: Math.random().toString(36).substr(2, 9)}));
                    updatePhotosState(prev => [...prev, ...newItems]);
                    setSelectedIds(newItems.map(p => p.id));
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
            }} 
            disabled={clipboard.length === 0}
            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            Colar
          </button>
          <div className="h-px bg-slate-100 my-1 mx-2"></div>
          <button 
             onClick={() => { applyProportionalCrop(); setContextMenu(prev => ({ ...prev, visible: false })); }} 
             disabled={selectedIds.length === 0}
             className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
             Recortar (Proporcional)
          </button>
          <button 
             onClick={() => { setActiveCropId(selectedIds[0]); setContextMenu(p => ({ ...p, visible: false })); }} 
             disabled={selectedIds.length === 0}
             className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeDasharray="2 2" /></svg>
             Recortar Livre
          </button>
          <button 
             onClick={() => { updatePhotos({ fitMode: 'fill' }); setContextMenu(prev => ({ ...prev, visible: false })); }} 
             disabled={selectedIds.length === 0}
             className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v16H4V4z" /></svg>
             Distorcer (Preencher Tudo)
          </button>
          <div className="h-px bg-slate-100 my-1 mx-2"></div>
          <button 
            onClick={() => { 
              if (selectedIds.length > 0) {
                updatePhotosState(current => current.filter(p => !selectedIds.includes(p.id)));
                setSelectedIds([]);
              }
              setContextMenu(prev => ({ ...prev, visible: false }));
            }} 
            disabled={selectedIds.length === 0}
            className="w-full text-left px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Excluir imagem selecionada
          </button>
          <button 
            onClick={() => { updatePhotos({ rotation: (firstSelected?.rotation || 0) + 90 }); setContextMenu(prev => ({ ...prev, visible: false })); }} 
            disabled={selectedIds.length === 0}
            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Girar ou inverter imagem
          </button>
        </div>
      )}

      {/* WORDART MODAL */}
      {isWordArtModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="font-black text-slate-800 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                 Galeria de WordArt
               </h3>
               <button onClick={() => setIsWordArtModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto do WordArt</label>
                   <textarea value={wordArtText} onChange={(e) => setWordArtText(e.target.value)} placeholder="Digite o seu texto aqui...\nPressione Enter para nova linha" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-lg resize-y min-h-[100px]" autoFocus />
                </div>
                
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione o Estilo</label>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[0, 1, 2, 3, 4, 5].map(styleIdx => (
                        <button 
                          key={styleIdx} 
                          onClick={() => setWordArtStyle(styleIdx)}
                          className={`relative aspect-video rounded-xl border-2 overflow-hidden flex items-center justify-center bg-white transition-all ${wordArtStyle === styleIdx ? 'border-amber-500 shadow-md ring-4 ring-amber-100 scale-105 z-10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'}`}
                        >
                           <img src={getWordArtSVG(wordArtText || 'WordArt', styleIdx)} alt={`Style ${styleIdx}`} className="w-full h-full object-contain p-2" draggable={false} />
                           {wordArtStyle === styleIdx && (
                              <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </div>
                           )}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsWordArtModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancelar
               </button>
               <button onClick={handleAddWordArt} disabled={!wordArtText.trim()} className="px-5 py-2.5 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 Adicionar à Página
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoA4Generator;
