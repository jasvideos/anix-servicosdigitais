const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

// First, inject activeCropId state
let activeCropIdSearch = "const [cropState, setCropState] = useState<{ active: boolean; photoId: string; startX: number; startY: number; currX: number; currY: number; hasDragged: boolean } | null>(null);";
let activeCropIdReplace = "const [activeCropId, setActiveCropId] = useState<string | null>(null);\n  const [cropBox, setCropBox] = useState<{ startX: number, startY: number, currX: number, currY: number, active: boolean } | null>(null);";

code = code.replace(/const \[cropState, setCropState\].*?\n/, activeCropIdReplace + '\n');

// Next, replace Free Crop Logic effect
let freeCropLogicRegex = /  \/\/ Free Crop Logic\n  useEffect\(\(\) => \{[\s\S]*?\}, \[cropState, photos\]\);\n/g;
let newFreeCropLogic = `  // Free Crop visually handled per photo.
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
`;
code = code.replace(freeCropLogicRegex, newFreeCropLogic + '\n');


// Fix contextMenu Recortar Livre click
let recortarLivreRegex = /onClick=\{\(\) => \{ applyFreeCrop\(\); setContextMenu\(prev => \(\{ \.\.\.prev, visible: false \}\)\); \}\}/;
code = code.replace(recortarLivreRegex, "onClick={() => { setActiveCropId(selectedIds[0]); setContextMenu(p => ({ ...p, visible: false })); }}");

// Replace onMouseDown in renderPhotoContent
let onMouseDownRegex = /onMouseDown=\{!isPrint \? \(e\) => handlePhotoMouseDown\(e, photo\.id\) : undefined\}/;
code = code.replace(onMouseDownRegex, "onMouseDown={!isPrint && activeCropId !== photo.id ? (e) => handlePhotoMouseDown(e, photo.id) : undefined}");

code = code.replace(/if \(!cropState\?.hasDragged\)/g, "if (!activeCropId)");

// Inject the crop overlay inside the photo div
let cropOverlayInjection = `
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
`;

code = code.replace(/\{\/\* CROP OVERLAY \*\/\}\s*\{\s*cropState && cropState.active(?:.|\n)*?\}\)\s*\}/, cropOverlayInjection);

code = code.replace(/Recortar Livre \(Ajustar\)/, "Recortar Livre");

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
