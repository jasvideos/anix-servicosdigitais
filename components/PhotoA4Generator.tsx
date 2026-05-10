
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
  fitMode?: 'cover' | 'contain' | 'fill';
  isWordArt?: boolean;
  wordArtText?: string;
  wordArtStyle?: number;
  wordArtColor?: string;
  wordArtBg?: string;
  wordArtStroke?: string;
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
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPolaroid, setIsPolaroid] = useState(false);
  const [isRound, setIsRound] = useState(false);
  const [gapMm, setGapMm] = useState(0);
  const [marginMm, setMarginMm] = useState(3);
  const [pageSize] = useState({ name: 'A4', w: 210, h: 297 });

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstSelected = photos.find(p => selectedIds.includes(p.id));

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
            contrast: 100
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

  const processFile = (file: File) => {
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
            contrast: 100
          }]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWordArt = () => {
    if (!wordArtText.trim()) return;
    const src = getWordArtSVG(wordArtText, wordArtStyle);
    const id = Math.random().toString(36).substr(2, 9);
    setPhotos(prev => [...prev, {
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

  // Keyboard Shortcuts & Context Menu Handlers
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
           setPhotos(current => current.filter(p => !selectedIds.includes(p.id)));
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
        setPhotos(prev => [...prev, ...newItems]);
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

  const applyProportionalCrop = () => {
    if (selectedIds.length === 0) return;
    setPhotos(prev => prev.map(photo => {
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
    setPhotos(prev => prev.map(photo => {
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
    setPhotos(prev => [...prev, ...newItems]);
  };

  const removeSelected = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (selectedIds.length === 0) return;
    setPhotos(current => current.filter(p => !selectedIds.includes(p.id)));
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
    setPhotos(prev => prev.map(p => p.id === draggingId ? { ...p, posX: dragStart.initialPosX + deltaX, posY: dragStart.initialPosY + deltaY } : p));
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
    setPhotos(prev => prev.map(p => 
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
      <div key={photo.id}
        onMouseDown={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onContextMenu={!isPrint ? (e) => handleContextMenu(e, photo.id) : undefined}
        style={{ 
          width: `${width}${unit}`, 
          height: `${height}${unit}`, 
          position: 'relative', 
          border: isPolaroid ? `${0.4 * factor}${unit} solid #cbd5e1` : (hasBorder && !isRound ? `${borderWidthMm * factor}${unit} solid ${borderColor}` : 'none'), 
          boxSizing: 'border-box', 
          overflow: 'hidden', 
          backgroundColor: isPolaroid ? 'white' : '#ffffff', 
          boxShadow: isPolaroid && !isPrint ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none',
          borderRadius: isRound ? '50%' : '0'
        }}
        className={`transition-all cursor-move select-none ${!isPrint && selectedIds.includes(photo.id) ? 'ring-4 ring-blue-500 ring-inset z-20 shadow-2xl scale-[1.02]' : ''}`}>
        {isRound && hasBorder && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            border: `${borderWidthMm * factor}${unit} solid ${borderColor}`,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 10
          }} />
        )}
        <div className="w-full h-full relative" style={{ padding: isPolaroid ? `${width * POLAROID_TOP_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit} ${height * POLAROID_BOTTOM_MARGIN_RATIO}${unit} ${width * POLAROID_SIDE_MARGIN_RATIO}${unit}` : '0' }}>
          <div className="w-full h-full relative overflow-hidden bg-slate-50" style={{ border: isPolaroid ? `${0.4 * factor}${unit} solid #94a3b8` : 'none', boxSizing: 'border-box' }}>
            <img 
              src={photo.src} 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: `translate(-50%, -50%) translate(${photo.posX}px, ${photo.posY}px) rotate(${photo.rotation}deg) scale(${photo.zoom})`, 
                width: '100%', 
                height: '100%', 
                objectFit: photo.fitMode || 'contain', 
                pointerEvents: 'none',
                filter: `brightness(${photo.brightness || 100}%) contrast(${photo.contrast || 100}%)`
              }} 
              draggable={false} 
            />
          </div>
        </div>
        {!isPrint && selectedIds.includes(photo.id) && (
          <div 
             className="absolute right-0 bottom-0 w-4 h-4 bg-blue-500 border-2 border-white rounded-tl cursor-nwse-resize z-30"
             onMouseDown={(e) => handleResizeStart(e, photo)}
             onTouchStart={(e) => handleResizeStart(e, photo)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in no-select bg-slate-100">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .print-page { width: ${orientation === 'portrait' ? pageSize.w : pageSize.h}mm; height: ${orientation === 'portrait' ? pageSize.h : pageSize.w}mm; display: flex; flex-wrap: wrap; gap: ${gapMm}mm; justify-content: flex-start; align-content: flex-start; padding: ${marginMm}mm; box-sizing: border-box; page-break-after: always; margin: 0 auto; position: relative; }
        }
        .checkerboard { background-image: linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%); background-size: 20px 20px; }
        .toolbar-group { display: flex; flex-direction: column; gap: 4px; padding-right: 16px; margin-right: 16px; border-right: 1px solid #e2e8f0; min-width: max-content; justify-content: center; }
        .toolbar-group:last-child { border-right: none; margin-right: 0; padding-right: 0;}
        .toolbar-group-title { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: center; letter-spacing: 0.05em; margin-bottom: 2px;}
        
        .c-range { -webkit-appearance: none; appearance: none; background: #cbd5e1; height: 4px; border-radius: 4px; cursor: pointer; }
        .c-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
        
        /* Hide scrollbar for toolbar to make it look cleaner, but keep functionality */
        .toolbar-scroll::-webkit-scrollbar { height: 6px; }
        .toolbar-scroll::-webkit-scrollbar-track { background: transparent; }
        .toolbar-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* TOP TOOLBAR (RIBBON) */}
      <div className="bg-white border-b border-slate-200 shadow-sm no-print flex flex-col shrink-0 z-40 w-full overflow-hidden">
        <div className="flex items-center px-4 pt-2 pb-1 border-b border-slate-100">
           <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none mr-2">Fotos <span className="text-blue-600">A4</span></h2>
           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic flex-1">Estúdio Pro</span>
           {isProcessingIA && <span className="text-xs font-bold text-indigo-600 animate-pulse bg-indigo-50 px-2 rounded">⌛ Processando IA...</span>}
        </div>
        
        <div className="flex overflow-x-auto toolbar-scroll p-3 items-stretch w-full select-none">
          
          {/* GROUP: ARQUIVO */}
          <div className="toolbar-group">
            <div className="toolbar-group-title">Arquivo</div>
            <div className="flex items-center gap-2 h-full">
               <button onClick={() => fileInputRef.current?.click()} className="h-full min-h-[60px] flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 px-4 rounded-xl text-white font-bold transition-all shadow-md shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span className="text-[10px] uppercase tracking-wider">Abrir</span>
               </button>
               <input type="file" multiple ref={fileInputRef} className="hidden" accept=".pdf, .png, .jpg, .jpeg, .gif, .webp, .tiff, .svg, image/*, application/pdf" onChange={handleFileUpload} />

               <button onClick={() => setIsWordArtModalOpen(true)} className="h-full min-h-[60px] flex flex-col items-center justify-center bg-amber-500 hover:bg-amber-600 px-4 rounded-xl text-white font-bold transition-all shadow-md shadow-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                  <span className="text-[10px] uppercase tracking-wider">WordArt</span>
               </button>
               
               <button onClick={() => window.print()} disabled={photos.length === 0} className="h-full min-h-[60px] flex flex-col items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 <span className="text-[10px] uppercase tracking-wider">Imprimir</span>
               </button>
            </div>
          </div>

          {/* GROUP: DIMENSÕES */}
          <div className="toolbar-group">
             <div className="toolbar-group-title">Dimensões ({selectedIds.length})</div>
             <div className="flex flex-col gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 justify-between">
                   <label className="text-[9px] font-bold text-slate-600 uppercase">Larg (mm)</label>
                   <input type="number" disabled={selectedIds.length === 0} value={firstSelected?.widthMm || 80} onChange={(e) => updatePhotos({ widthMm: Number(e.target.value) })} className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-center text-blue-700 disabled:opacity-50" />
                </div>
                <div className="flex items-center gap-2 justify-between">
                   <label className="text-[9px] font-bold text-slate-600 uppercase">Alt (mm)</label>
                   <input type="number" disabled={selectedIds.length === 0 || isPolaroid} value={firstSelected?.heightMm || 100} onChange={(e) => updatePhotos({ heightMm: Number(e.target.value) })} className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-center text-blue-700 disabled:opacity-50" />
                </div>
                {!isPolaroid && selectedIds.length > 0 && (
                   <div className="flex flex-wrap gap-1 w-[110px] justify-center mt-1">
                      {[ {l:'1:1', r:1}, {l:'4:3', r:4/3}, {l:'3:2', r:3/2}, {l:'16:9', r:16/9}, {l:'3:4', r:3/4}, {l:'2:3', r:2/3} ].map(ratio => (
                        <button 
                          key={ratio.l} 
                          onClick={() => {
                            const newHeight = firstSelected!.widthMm / ratio.r;
                            updatePhotos({ heightMm: Math.round(newHeight) });
                          }}
                          className="text-[8px] bg-white border border-slate-200 text-slate-500 px-1 py-0.5 rounded hover:bg-slate-100 font-bold"
                        >
                          {ratio.l}
                        </button>
                      ))}
                   </div>
                )}
             </div>
          </div>

          {/* GROUP: PÁGINA */}
          <div className="toolbar-group">
            <div className="toolbar-group-title">Página & Layout</div>
            <div className="grid grid-cols-2 gap-2 h-full">
                <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className="bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-700">
                  {orientation === 'portrait' ? '📄 Retrato' : '📂 Paisagem'}
                </button>
                <button onClick={() => setIsPolaroid(!isPolaroid)} className={`px-2 py-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-colors ${isPolaroid ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  📸 Polaroid
                </button>
                <button onClick={() => setIsRound(!isRound)} className={`px-2 py-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-colors ${isRound ? 'bg-orange-100 border-orange-300 text-orange-800 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  ⭕ Redonda
                </button>
                <div className="col-span-2 flex flex-col gap-1">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 justify-between">
                    <label className="text-[9px] font-bold text-slate-600 uppercase">Espaço (mm)</label>
                    <input type="number" min="0" max="50" value={gapMm} onChange={(e)=>setGapMm(Number(e.target.value))} className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 text-[10px]" />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 justify-between">
                    <label className="text-[9px] font-bold text-slate-600 uppercase">Margem (mm)</label>
                    <input type="number" min="0" max="50" value={marginMm} onChange={(e)=>setMarginMm(Number(e.target.value))} className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 text-[10px]" />
                  </div>
                </div>
            </div>
          </div>

          {/* GROUP: AÇÕES */}
          <div className="toolbar-group">
            <div className="toolbar-group-title">Ações ({selectedIds.length})</div>
            <div className="flex gap-3 h-full items-center">
               
               <div className="flex flex-col gap-1.5 justify-center h-full">
                  <button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="bg-slate-800 text-white hover:bg-black px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-40 transition-colors h-full">
                    👯<span className="ml-1">Duplicar</span>
                  </button>
                  <button onClick={removeSelected} disabled={selectedIds.length === 0} className="bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-40 transition-colors h-full">
                    🗑️<span className="ml-1">Excluir</span>
                  </button>
               </div>
               
               <button onClick={handleRemoveBackground} disabled={selectedIds.length === 0 || isProcessingIA} className="bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex flex-col items-center justify-center h-full min-h-[60px] disabled:opacity-40 transition-colors">
                  <span className="text-lg leading-none mb-1">✨</span>
                  <span>Ext. Fundo</span>
               </button>

            </div>
          </div>

          {/* GROUP: AJUSTES */}
          <div className="toolbar-group">
             <div className="toolbar-group-title">Ajustes da Imagem</div>
             <div className="grid grid-cols-2 gap-x-4 gap-y-2 h-full bg-slate-50 p-2 rounded-lg border border-slate-200 content-center border-dashed">
                
                <div className="flex items-center gap-1 justify-between w-40">
                  <label className="text-[9px] font-bold text-slate-700 uppercase">Zoom</label>
                  <input type="range" min="0.1" max="10" step="0.01" value={firstSelected?.zoom || 1} onChange={(e) => updatePhotos({ zoom: Number(e.target.value) })} disabled={selectedIds.length === 0} className="c-range w-14" />
                  <div className="flex items-center">
                    <button onClick={() => updatePhotos({ zoom: Math.max(0.1, Number(((firstSelected?.zoom || 1) - 0.05).toFixed(2))) })} disabled={selectedIds.length === 0} className="text-[8px] bg-white border border-slate-300 text-slate-600 px-1 py-0.5 rounded-l hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center -mr-px" title="Diminuir Zoom (Menos)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg>
                    </button>
                    <button onClick={() => updatePhotos({ zoom: Math.min(10, Number(((firstSelected?.zoom || 1) + 0.05).toFixed(2))) })} disabled={selectedIds.length === 0} className="text-[8px] bg-white border border-slate-300 text-slate-600 px-1 py-0.5 hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center -mr-px" title="Aumentar Zoom (Mais)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={applyProportionalCrop} title="Resetar Zoom" disabled={selectedIds.length===0} className="text-[9px] bg-white border border-slate-300 text-slate-600 px-1.5 py-0.5 rounded-r hover:bg-slate-100 disabled:opacity-50 font-bold">R</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-between w-32">
                  <label className="text-[9px] font-bold text-slate-700 uppercase">Enquadra.</label>
                  <select 
                    value={firstSelected?.fitMode || 'contain'} 
                    onChange={(e) => updatePhotos({ fitMode: e.target.value as any })}
                    disabled={selectedIds.length === 0}
                    className="text-[9px] bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded outline-none w-20"
                  >
                    <option value="cover">Preencher (Crop)</option>
                    <option value="contain">Ajustar (Interno)</option>
                    <option value="fill">Distorcer (Ratio)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 justify-between w-32">
                  <label className="text-[9px] font-bold text-slate-700 uppercase">Giro</label>
                  <button onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) - 90 })} disabled={selectedIds.length === 0} className="text-[9px] bg-white border border-slate-300 text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100 disabled:opacity-50">-</button>
                  <input type="range" min="0" max="360" step="1" value={firstSelected?.rotation || 0} onChange={(e) => updatePhotos({ rotation: Number(e.target.value) })} disabled={selectedIds.length === 0} className="c-range w-12" />
                  <button onClick={() => updatePhotos({ rotation: (firstSelected?.rotation || 0) + 90 })} disabled={selectedIds.length === 0} className="text-[9px] bg-white border border-slate-300 text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100 disabled:opacity-50">+</button>
                </div>

                <div className="flex items-center gap-1 justify-between w-[140px]">
                  <label className="text-[9px] font-bold text-amber-700 uppercase w-10">Brilho</label>
                  <input type="range" min="0" max="200" step="1" value={firstSelected?.brightness || 100} onChange={(e) => updatePhotos({ brightness: Number(e.target.value) })} disabled={selectedIds.length === 0} className="c-range w-14" />
                  <div className="flex flex-col gap-[1px]">
                    <button onClick={() => updatePhotos({ brightness: Math.min(200, (firstSelected?.brightness || 100) + 5) })} disabled={selectedIds.length === 0} className="text-[6px] leading-[8px] px-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-t disabled:opacity-50">▲</button>
                    <button onClick={() => updatePhotos({ brightness: Math.max(0, (firstSelected?.brightness || 100) - 5) })} disabled={selectedIds.length === 0} className="text-[6px] leading-[8px] px-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-b disabled:opacity-50">▼</button>
                  </div>
                </div>

                <div className="flex items-center gap-1 justify-between w-[140px]">
                  <label className="text-[9px] font-bold text-amber-700 uppercase w-10">Contra</label>
                  <input type="range" min="0" max="200" step="1" value={firstSelected?.contrast || 100} onChange={(e) => updatePhotos({ contrast: Number(e.target.value) })} disabled={selectedIds.length === 0} className="c-range w-14" />
                  <div className="flex flex-col gap-[1px]">
                    <button onClick={() => updatePhotos({ contrast: Math.min(200, (firstSelected?.contrast || 100) + 5) })} disabled={selectedIds.length === 0} className="text-[6px] leading-[8px] px-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-t disabled:opacity-50">▲</button>
                    <button onClick={() => updatePhotos({ contrast: Math.max(0, (firstSelected?.contrast || 100) - 5) })} disabled={selectedIds.length === 0} className="text-[6px] leading-[8px] px-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-b disabled:opacity-50">▼</button>
                  </div>
                </div>

             </div>
          </div>

          {/* GROUP: BORDA */}
          <div className="toolbar-group border-r-0 mr-0 pr-0">
             <div className="toolbar-group-title">Borda</div>
             <div className="flex flex-col gap-2 h-full justify-center">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg w-max flex-1">
                    <input type="checkbox" checked={hasBorder} onChange={(e)=>setHasBorder(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-blue-600" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Habilitar</span>
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg w-max" style={{opacity: hasBorder ? 1 : 0.4, pointerEvents: hasBorder ? 'auto' : 'none'}}>
                    <span className="text-[9px] font-bold text-slate-700 uppercase min-w-[30px]">Esp.</span>
                    <input type="number" min="0.1" max="10" step="0.1" value={borderWidthMm} onChange={(e) => setBorderWidthMm(Number(e.target.value))} className="w-10 bg-white border border-slate-200 rounded px-1 min-h-[16px] text-[10px] font-bold text-center text-blue-700 outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 transition-opacity" style={{opacity: hasBorder ? 1 : 0.4, pointerEvents: hasBorder ? 'auto' : 'none'}}>
                  {['#000000', '#7F7F7F', '#ED1C24', '#22B14C', '#00A2E8', '#FFFFFF'].map(color => (
                     <button key={color} onClick={() => setBorderColor(color)} className={`w-5 h-5 rounded border ${borderColor === color ? 'ring-2 ring-blue-500 border-white scale-110' : 'border-slate-300 hover:scale-105'} transition-all`} style={{ backgroundColor: color }} />
                  ))}
                  <input type="color" value={borderColor} onChange={e=>setBorderColor(e.target.value)} className="w-6 h-6 p-0 border-0 cursor-pointer rounded overflow-hidden ml-1" />
                </div>
             </div>
          </div>

          {firstSelected?.isWordArt && (
            <div className="toolbar-group shrink-0 relative">
               <div className="toolbar-group-title text-amber-600">WordArt</div>
               <div className="flex gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <div className="flex flex-col gap-1 w-[120px]">
                     <label className="text-[9px] font-bold text-amber-800 uppercase">Texto</label>
                     <textarea rows={2} value={firstSelected.wordArtText || ''} onChange={(e) => {
                       const newText = e.target.value;
                       updatePhotos({ 
                         wordArtText: newText, 
                         src: getWordArtSVG(newText, firstSelected.wordArtStyle || 0, firstSelected.wordArtColor, firstSelected.wordArtBg, firstSelected.wordArtStroke) 
                       });
                     }} className="w-full text-[10px] p-1 border border-amber-300 rounded resize-none" />
                  </div>
                  <div className="flex flex-col gap-1 w-[80px]">
                     <label className="text-[9px] font-bold text-amber-800 uppercase">Estilo</label>
                     <select value={firstSelected.wordArtStyle || 0} onChange={(e) => {
                       const s = parseInt(e.target.value);
                       updatePhotos({ wordArtStyle: s, src: getWordArtSVG(firstSelected.wordArtText || '', s, firstSelected.wordArtColor, firstSelected.wordArtBg, firstSelected.wordArtStroke) });
                     }} className="w-full text-[10px] p-0.5 border border-amber-300 bg-white rounded outline-none">
                       <option value={0}>Clássico</option>
                       <option value={1}>Impacto</option>
                       <option value={2}>Arco-íris</option>
                       <option value={3}>Elegante</option>
                       <option value={4}>Fogo</option>
                       <option value={5}>Sombra 3D</option>
                     </select>
                  </div>
                  <div className="flex flex-col gap-1 w-[40px]">
                     <label className="text-[9px] font-bold text-amber-800 uppercase" title="Cor Principal">Cor</label>
                     <input type="color" value={firstSelected.wordArtColor || '#ffffff'} onChange={(e) => {
                       const c = e.target.value;
                       updatePhotos({ wordArtColor: c, src: getWordArtSVG(firstSelected.wordArtText || '', firstSelected.wordArtStyle || 0, c, firstSelected.wordArtBg, firstSelected.wordArtStroke) });
                     }} className="w-full h-5 cursor-pointer bg-white border border-amber-300 p-0 rounded" />
                  </div>
                  <div className="flex flex-col gap-1 w-[40px]">
                     <label className="text-[9px] font-bold text-amber-800 uppercase" title="Borda/Contorno">Contorno</label>
                     <input type="color" value={firstSelected.wordArtStroke || '#000000'} onChange={(e) => {
                       const c = e.target.value;
                       updatePhotos({ wordArtStroke: c, src: getWordArtSVG(firstSelected.wordArtText || '', firstSelected.wordArtStyle || 0, firstSelected.wordArtColor, firstSelected.wordArtBg, c) });
                     }} className="w-full h-5 cursor-pointer bg-white border border-amber-300 p-0 rounded" />
                  </div>
                  <div className="flex flex-col gap-1 w-[40px]">
                     <label className="text-[9px] font-bold text-amber-800 uppercase" title="Cor de Fundo">Fundo</label>
                     <input type="color" value={firstSelected.wordArtBg || '#ffffff'} onChange={(e) => {
                       const c = e.target.value;
                       updatePhotos({ wordArtBg: c, src: getWordArtSVG(firstSelected.wordArtText || '', firstSelected.wordArtStyle || 0, firstSelected.wordArtColor, c, firstSelected.wordArtStroke) });
                     }} className="w-full h-5 cursor-pointer bg-white border border-amber-300 p-0 rounded" />
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* WORKSPACE PREVIEW AREA */}
      <div 
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
          <div key={pageIndex} className="print-page">
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
                    setPhotos(prev => [...prev, ...newItems]);
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
             onClick={() => { applyFreeCrop(); setContextMenu(prev => ({ ...prev, visible: false })); }} 
             disabled={selectedIds.length === 0}
             className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeDasharray="2 2" /></svg>
             Recortar Livre (Ajustar)
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
                setPhotos(current => current.filter(p => !selectedIds.includes(p.id)));
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
