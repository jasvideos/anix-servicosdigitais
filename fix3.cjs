const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

// Find the Left Sidebar tools to remove or hide.
// I will just hide them from the sidebar since they might still be useful, or I can remove them entirely.
// Actually, let's just make the top bar elements, and I'll remove the sidebar elements.

const topBarPortal = `
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
`;

code = code.replace("  const fileInputRef = useRef<HTMLInputElement>(null);", topBarPortal + "\n  const fileInputRef = useRef<HTMLInputElement>(null);");

// Removing from sidebar
let startToRemove = "{/* GROUP: AJUSTES */}";
let endToRemove = "{/* WORDART PANEL */}";
let i1 = code.indexOf(startToRemove);
let i2 = code.indexOf(endToRemove);
if (i1 > -1 && i2 > -1) {
  code = code.substring(0, i1) + code.substring(i2);
}

// Inject topBarContent rendering
code = code.replace("{/* LEFT SIDEBAR TOOLBAR */}", "{topBarContent}\n      {/* LEFT SIDEBAR TOOLBAR */}");

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
