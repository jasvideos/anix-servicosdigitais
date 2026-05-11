const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

const cropEffect = `  // Free Crop Logic
  useEffect(() => {
    if (!cropState || !cropState.active) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setCropState(prev => {
        if (!prev) return prev;
        const dx = e.clientX - prev.startX;
        const dy = e.clientY - prev.startY;
        const hasDragged = prev.hasDragged || Math.sqrt(dx*dx + dy*dy) > 5;
        return { ...prev, currX: e.clientX, currY: e.clientY, hasDragged };
      });
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      setCropState(prev => {
        if (prev && prev.hasDragged) {
          // perform crop
          const px = Math.min(prev.startX, prev.currX);
          const py = Math.min(prev.startY, prev.currY);
          const pw = Math.abs(prev.currX - prev.startX);
          const ph = Math.abs(prev.currY - prev.startY);
          
          if (pw > 10 && ph > 10) {
            // we have the screen crop rectangle. But we need its relative position
            // get the image element
            const el = document.getElementById('photo-' + prev.photoId);
            if (el) {
              const rect = el.getBoundingClientRect();
              const relX = (px - rect.left) / rect.width;
              const relY = (py - rect.top) / rect.height;
              const relW = pw / rect.width;
              const relH = ph / rect.height;
              
              const photo = photos.find(p => p.id === prev.photoId);
              if (photo && photo.src.startsWith('data:image')) {
                 const img = new Image();
                 img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const cw = img.width * relW;
                    const ch = img.height * relH;
                    if (cw > 0 && ch > 0) {
                       canvas.width = cw;
                       canvas.height = ch;
                       const ctx = canvas.getContext('2d');
                       if (ctx) {
                         ctx.drawImage(img, img.width * relX, img.height * relY, cw, ch, 0, 0, cw, ch);
                         const newDataUrl = canvas.toDataURL('image/png', 1.0);
                         updatePhotosState((currentPhotos: any) => 
                           currentPhotos.map((p: any) => p.id === prev.photoId ? { 
                             ...p, 
                             src: newDataUrl, 
                             widthMm: Math.max(10, p.widthMm * relW), 
                             heightMm: Math.max(10, p.heightMm * relH),
                             zoom: 1, offsetX: 0, offsetY: 0, rotation: 0
                           } : p)
                         );
                       }
                    }
                 };
                 img.src = photo.src;
              }
            }
          }
        }
        return null;
      });
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [cropState, photos]);`;

code = code.replace("  // Keyboard Shortcuts & Context Menu Handlers", cropEffect + "\n\n  // Keyboard Shortcuts & Context Menu Handlers");

const handleMouseDownReplace = `  const handlePhotoMouseDown = (e: React.MouseEvent, photoId: string) => {
    if (e.button === 2) {
      e.preventDefault();
      // start crop
      if (!selectedIds.includes(photoId)) {
        setSelectedIds([photoId]);
      }
      setCropState({ active: true, photoId, startX: e.clientX, startY: e.clientY, currX: e.clientX, currY: e.clientY, hasDragged: false });
    } else {
      const photo = photos.find(p => p.id === photoId);
      if (photo) handleDragStart(e, photo);
    }
  };`;

code = code.replace("  const handleContextMenu = (e: React.MouseEvent, photoId?: string) => {", handleMouseDownReplace + "\n\n  const handleContextMenu = (e: React.MouseEvent, photoId?: string) => {");

let r2 = `        onMouseDown={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onContextMenu={!isPrint ? (e) => handleContextMenu(e, photo.id) : undefined}`;

let repl2 = `        onMouseDown={!isPrint ? (e) => handlePhotoMouseDown(e, photo.id) : undefined}
        onTouchStart={!isPrint ? (e) => handleDragStart(e, photo) : undefined}
        onContextMenu={(e) => { e.preventDefault(); if (!cropState?.hasDragged) handleContextMenu(e, photo.id); }}`;

code = code.replace(r2, repl2);

// Add crop rectangle overlay
let rC = `        {/* Camada de Sobreposição */}`;
let replC = `        {/* CROP OVERLAY */}
        {cropState && cropState.active && cropState.photoId === photo.id && cropState.hasDragged && (
           <div 
             style={{ 
               position: 'fixed', 
               left: Math.min(cropState.startX, cropState.currX), 
               top: Math.min(cropState.startY, cropState.currY), 
               width: Math.abs(cropState.currX - cropState.startX), 
               height: Math.abs(cropState.currY - cropState.startY), 
               border: '2px dashed #3b82f6', 
               backgroundColor: 'rgba(59, 130, 246, 0.2)', 
               zIndex: 9999, 
               pointerEvents: 'none' 
             }} 
           />
        )}
        
        {/* Camada de Sobreposição */}`;

code = code.replace(rC, replC);

// also add id to el
let elR = `      <div key={photo.id}`;
let elRepl = `      <div key={photo.id} id={"photo-" + photo.id}`;
code = code.replace(elR, elRepl);


fs.writeFileSync('components/PhotoA4Generator.tsx', code);
