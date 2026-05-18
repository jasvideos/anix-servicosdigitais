<<<<<<< HEAD
import { Printer, LayoutTemplate, MousePointer2, Link as LinkIcon } from "lucide-react";
=======
import { Printer, LayoutTemplate, MousePointer2 } from "lucide-react";
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
import { useState, useRef } from "react";
import { motion } from "motion/react";

type CustomTextConfig = {
  fontSize: number;
  width: number;
  align: "left" | "center" | "right" | "justify";
  color: string;
};

export default function DedicationGenerator() {
  const [title, setTitle] = useState("À Minha Família");
  const [body, setBody] = useState(
    "Agradeço imensamente por todo o apoio, carinho e dedicação ao longo desta jornada. Sem vocês, nada do que conquistei seria possível."
  );
  const [footer, setFooter] = useState("Com amor e gratidão,\n[Seu Nome]\n2026");
  const [customBg, setCustomBg] = useState<string | null>(null);
<<<<<<< HEAD
  const [bgUrl, setBgUrl] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
=======
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
  
  const [customTitle, setCustomTitle] = useState<CustomTextConfig>({ fontSize: 40, width: 80, align: "center", color: "#1f2937" });
  const [customBody, setCustomBody] = useState<CustomTextConfig>({ fontSize: 20, width: 85, align: "center", color: "#4b5563" });
  const [customFooter, setCustomFooter] = useState<CustomTextConfig>({ fontSize: 16, width: 80, align: "center", color: "#6b7280" });
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState("#000000");
<<<<<<< HEAD
  
  const [bgFit, setBgFit] = useState<"cover" | "contain" | "custom">("cover");
  const [bgZoom, setBgZoom] = useState(100);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
=======
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
<<<<<<< HEAD
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-900 font-sans w-full h-[calc(100vh-64px)] overflow-hidden">
      <style>
        {`@media print {
            @page {
                size: ${orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
                margin: 0;
            }
            .a4-page.landscape {
                width: 297mm !important;
                height: 210mm !important;
            }
        }`}
      </style>
      
      {/* SIDEBAR ESQUERDA: LAYOUT LIVRE E CONFIGS */}
      <aside className="no-print w-full md:w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 flex-shrink-0 z-10 shadow-sm overflow-y-auto h-full custom-scrollbar">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-1 text-indigo-900">
            <LayoutTemplate className="w-5 h-5 text-indigo-600" />
            Layout Livre & Estilo
          </h2>
          <p className="text-xs text-gray-500">Personalize o fundo, bordas e fontes.</p>
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-3 p-4 bg-indigo-50/30 rounded-lg border border-indigo-100">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">1. Imagem de Fundo (Upload)</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setCustomBg(e.target?.result as string);
                    setBgUrl("");
                  };
                  reader.readAsDataURL(file);
                }
              }} className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:bg-indigo-600 file:text-white" />
            </div>

            <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-indigo-100">
              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> 2. OU COLE A URL DA IMAGEM
              </span>
              <input 
                  type="url" 
                  placeholder="https://exemplo.com/fundo.jpg" 
                  value={bgUrl} 
                  onChange={(e) => {
                    setBgUrl(e.target.value);
                    setCustomBg(e.target.value); 
                  }} 
                  className="text-xs p-2 border border-indigo-200 rounded-md outline-none focus:border-indigo-400" 
              />
              <div className="mt-1 text-[11px] bg-white p-2 rounded border border-indigo-50 flex flex-col gap-1.5">
                <span className="text-gray-500 font-medium">Nota: Use apenas endereços diretos de imagens (terminados em .jpg, .png, etc). Clique com o botão direito na imagem e escolha "Copiar endereço da imagem".</span>
                <a href="https://www.google.com/search?tbm=isch&q=fundo+floral" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Buscar "fundo floral" no Google</a>
                <a href="https://br.pinterest.com/search/pins/?q=fundo%20convite" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">Buscar "fundo convite" no Pinterest</a>
              </div>
            </div>

            {customBg && (
              <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-indigo-100">
                <span className="text-[11px] font-semibold text-gray-700">Ajuste da Imagem</span>
                <div className="flex gap-2">
                  <button onClick={() => setBgFit("cover")} className={`flex-1 py-1.5 text-[10px] font-medium rounded border ${bgFit === 'cover' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-indigo-200 hover:bg-slate-50'}`}>Preencher</button>
                  <button onClick={() => setBgFit("contain")} className={`flex-1 py-1.5 text-[10px] font-medium rounded border ${bgFit === 'contain' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-indigo-200 hover:bg-slate-50'}`}>Caber</button>
                  <button onClick={() => setBgFit("custom")} className={`flex-1 py-1.5 text-[10px] font-medium rounded border ${bgFit === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-indigo-200 hover:bg-slate-50'}`}>Manual</button>
                </div>
                {bgFit === "custom" && (
                  <div className="flex flex-col gap-3 mt-2 bg-white p-2 rounded border border-indigo-50">
                    <label className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">Tamanho/Zoom</span>
                        <span className="text-[10px] text-indigo-600 font-medium">{bgZoom}%</span>
                      </div>
                      <input type="range" min="10" max="300" value={bgZoom} onChange={e => setBgZoom(Number(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">Posição X (Horizontal)</span>
                        <span className="text-[10px] text-indigo-600 font-medium">{bgPosX}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={bgPosX} onChange={e => setBgPosX(Number(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">Posição Y (Vertical)</span>
                        <span className="text-[10px] text-indigo-600 font-medium">{bgPosY}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={bgPosY} onChange={e => setBgPosY(Number(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-1 border-t border-indigo-100 pt-3">
              <span className="text-[11px] font-semibold text-gray-700">3. Orientação da Página</span>
              <div className="flex gap-2">
                <button onClick={() => setOrientation("portrait")} className={`flex-1 py-1.5 text-xs font-medium rounded border ${orientation === "portrait" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-indigo-200 hover:bg-slate-50"}`}>Retrato</button>
                <button onClick={() => setOrientation("landscape")} className={`flex-1 py-1.5 text-xs font-medium rounded border ${orientation === "landscape" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-indigo-200 hover:bg-slate-50"}`}>Paisagem</button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1 border-t border-indigo-100 pt-3">
              <span className="text-[11px] font-semibold text-gray-700">4. Borda da Página</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Espessura (px)</span>
                  <input type="number" min="0" value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} className="text-sm p-1.5 border border-indigo-200 rounded-md" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Cor</span>
                  <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="h-8 w-full cursor-pointer rounded-md border border-indigo-200 p-0" />
                </label>
              </div>
            </div>

            <p className="text-[10px] text-indigo-700 mt-2 font-medium flex items-center gap-1.5 bg-indigo-100/50 p-2 rounded">
              <MousePointer2 className="w-4 h-4 shrink-0" /> Arraste os textos diretamente na folha para posicioná-los!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ConfigPanel label="Estilo do Título" config={customTitle} setConfig={setCustomTitle} />
            <ConfigPanel label="Estilo do Texto Principal" config={customBody} setConfig={setCustomBody} />
            <ConfigPanel label="Estilo do Rodapé" config={customFooter} setConfig={setCustomFooter} />
          </div>
        </div>
      </aside>

      {/* ÁREA DE PREVIEW (CENTRO) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center bg-[#e2e8f0] h-full custom-scrollbar">
        <div className="flex flex-col items-center w-full max-w-full">
          <div ref={printRef} className={`a4-page relative bg-white shadow-2xl flex-shrink-0 print-area ${orientation === 'landscape' ? 'landscape' : ''}`} style={{ aspectRatio: orientation === 'portrait' ? "210 / 297" : "297 / 210", width: orientation === 'portrait' ? "210mm" : "297mm", height: orientation === 'portrait' ? "297mm" : "210mm", maxHeight: "80vh", transform: "scale(0.85)", transformOrigin: "top center" }}>
            <TemplateContent title={title} body={body} footer={footer} customBg={customBg} customTitle={customTitle} customBody={customBody} customFooter={customFooter} borderWidth={borderWidth} borderColor={borderColor} orientation={orientation} bgFit={bgFit} bgZoom={bgZoom} bgPosX={bgPosX} bgPosY={bgPosY} />
          </div>
          <div className="mt-8 text-center text-sm text-gray-500 font-medium no-print">Tamanho real: A4 ({orientation === 'portrait' ? "210 x 297 mm" : "297 x 210 mm"})</div>
        </div>
      </main>

      {/* SIDEBAR DIREITA: TEXTOS E BOTÃO DE IMPRESSÃO */}
      <aside className="no-print w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col gap-6 flex-shrink-0 z-10 shadow-sm overflow-y-auto h-full custom-scrollbar">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1 text-slate-800">
            Dedicatórias
          </h1>
          <p className="text-sm text-gray-500">Insira os textos do seu modelo.</p>
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Texto Principal</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-scrollbar" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Rodapé</label>
            <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={4} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-scrollbar" />
          </div>
        </div>

        <button onClick={handlePrint} className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition font-medium shadow-md shadow-indigo-200">
          <Printer className="w-5 h-5" /> Imprimir / Salvar PDF
        </button>
      </aside>
=======
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-900 font-sans">
      <aside className="no-print w-full md:w-96 bg-white border-r border-gray-200 p-6 flex flex-col gap-8 flex-shrink-0 z-10 shadow-sm overflow-y-auto max-h-screen">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-600" />
            Dedicatórias
          </h1>
          <p className="text-sm text-gray-500">Crie seu modelo em tamanho A4 para impressão.</p>
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Texto Principal</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none resize-none" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Rodapé</label>
              <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none resize-none" />
            </div>

            <hr className="border-gray-200 my-2" />
            
            <div className="flex flex-col gap-3 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> Layout Livre
              </label>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">1. Imagem de Fundo</span>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setCustomBg(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:bg-indigo-600 file:text-white" />
              </div>

              <div className="flex flex-col gap-1.5 mt-1 border-t border-indigo-100 pt-3">
                <span className="text-[11px] font-semibold text-gray-700">3. Borda da Página</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Espessura (px)</span>
                    <input type="number" min="0" value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} className="text-sm p-1.5 border border-indigo-200 rounded-md" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Cor</span>
                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="h-8 w-full cursor-pointer rounded-md border border-indigo-200 p-0" />
                  </label>
                </div>
              </div>

              <p className="text-xs text-indigo-700 mt-2 font-medium flex items-center gap-1.5 bg-indigo-100/50 p-2 rounded">
                <MousePointer2 className="w-4 h-4 shrink-0" /> Dica: Arraste os textos diretamente na folha para posicioná-los!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <ConfigPanel label="Título" config={customTitle} setConfig={setCustomTitle} />
              <ConfigPanel label="Texto Principal" config={customBody} setConfig={setCustomBody} />
              <ConfigPanel label="Rodapé" config={customFooter} setConfig={setCustomFooter} />
            </div>
          </div>
        </div>

        <button onClick={handlePrint} className="mt-auto flex items-center justify-center gap-2 bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition font-medium">
          <Printer className="w-5 h-5" /> Imprimir / Salvar PDF
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center bg-gray-100">
        <div className="flex flex-col items-center w-full max-w-full">
          <div ref={printRef} className="a4-page relative bg-white shadow-xl flex-shrink-0 w-full md:w-auto" style={{ aspectRatio: "210 / 297", maxWidth: "210mm", minWidth: "min(100%, 210mm)" }}>
            <TemplateContent title={title} body={body} footer={footer} customBg={customBg} customTitle={customTitle} customBody={customBody} customFooter={customFooter} borderWidth={borderWidth} borderColor={borderColor} />
          </div>
          <div className="mt-8 text-center text-sm text-gray-400 no-print">Tamanho da página: A4 (210 x 297 mm)</div>
        </div>
      </main>
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
    </div>
  );
}

function ConfigPanel({ label, config, setConfig }: any) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="font-semibold text-sm text-gray-800">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-gray-500">Tamanho (px)</span>
          <input type="number" value={config.fontSize} onChange={e => setConfig({...config, fontSize: Number(e.target.value)})} className="text-sm p-1.5 border border-gray-300 rounded" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-gray-500">Largura (%)</span>
          <input type="number" value={config.width} onChange={e => setConfig({...config, width: Number(e.target.value)})} className="text-sm p-1.5 border border-gray-300 rounded" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-gray-500">Cor</span>
          <input type="color" value={config.color} onChange={e => setConfig({...config, color: e.target.value})} className="h-8 w-full cursor-pointer rounded border border-gray-300 p-0.5" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-gray-500">Alinhamento</span>
          <select value={config.align} onChange={e => setConfig({...config, align: e.target.value as any})} className="text-sm p-1.5 border border-gray-300 rounded">
            <option value="left">Esq</option>
            <option value="center">Centro</option>
            <option value="right">Dir</option>
            <option value="justify">Just</option>
          </select>
        </label>
      </div>
    </div>
  )
}

function DraggableText({ text, config, defaultPos, fontFamily, fontWeight }: any) {
  if (!text) return null;
  return (
    <motion.div drag dragMomentum={false} style={{ position: 'absolute', top: defaultPos.top, left: `calc(50% - ${config.width / 2}%)`, width: `${config.width}%`, color: config.color, textAlign: config.align, fontSize: `${config.fontSize}px`, cursor: 'grab', x: 0, y: 0 }} whileDrag={{ cursor: "grabbing" }} className="group z-10 flex flex-col items-center justify-center">
      <div className={`whitespace-pre-wrap leading-tight ${fontFamily} ${fontWeight} hover:outline hover:outline-2 outline-dashed outline-indigo-500 outline-offset-4 hover:bg-white/10 print:outline-none w-full transition-colors rounded p-1`}>
        {text}
      </div>
    </motion.div>
  );
}

<<<<<<< HEAD
function TemplateContent({ title, body, footer, customBg, customTitle, customBody, customFooter, borderWidth = 0, borderColor = "#000000", orientation, bgFit = "cover", bgZoom = 100, bgPosX = 50, bgPosY = 50 }: any) {
  let backgroundSize = bgFit;
  if(bgFit === 'custom') {
    backgroundSize = `${bgZoom}%`;
  }
  let backgroundPosition = "center";
  if(bgFit === 'custom') {
    backgroundPosition = `${bgPosX}% ${bgPosY}%`;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-white" style={{ backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize, backgroundPosition, backgroundRepeat: 'no-repeat', borderStyle: borderWidth > 0 ? 'solid' : 'none', borderWidth: `${borderWidth}px`, borderColor: borderColor, boxSizing: 'border-box' }}>
      {!customBg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 -z-10 text-gray-400 p-8 text-center text-sm">
          <LayoutTemplate className="w-12 h-12 mb-4 text-gray-300" />
          Nenhuma imagem selecionada. <br/>Faça o upload ou cole uma URL no menu lateral!
        </div>
      )}
      {customTitle && <DraggableText text={title} config={customTitle} defaultPos={{ top: orientation === 'portrait' ? '15%' : '10%' }} fontFamily="font-serif" fontWeight="font-bold" />}
      {customBody && <DraggableText text={body} config={customBody} defaultPos={{ top: '40%' }} fontFamily="font-sans" fontWeight="font-medium" />}
      {customFooter && <DraggableText text={footer} config={customFooter} defaultPos={{ top: orientation === 'portrait' ? '80%' : '75%' }} fontFamily="font-sans" fontWeight="font-bold" />}
=======
function TemplateContent({ title, body, footer, customBg, customTitle, customBody, customFooter, borderWidth = 0, borderColor = "#000000" }: any) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-white" style={{ backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderStyle: borderWidth > 0 ? 'solid' : 'none', borderWidth: `${borderWidth}px`, borderColor: borderColor, boxSizing: 'border-box' }}>
      {!customBg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 -z-10 text-gray-400 p-8 text-center text-sm">
          <LayoutTemplate className="w-12 h-12 mb-4 text-gray-300" />
          Nenhuma imagem selecionada. <br/>Faça o upload no menu lateral!
        </div>
      )}
      {customTitle && <DraggableText text={title} config={customTitle} defaultPos={{ top: '15%' }} fontFamily="font-serif" fontWeight="font-bold" />}
      {customBody && <DraggableText text={body} config={customBody} defaultPos={{ top: '40%' }} fontFamily="font-sans" fontWeight="font-medium" />}
      {customFooter && <DraggableText text={footer} config={customFooter} defaultPos={{ top: '80%' }} fontFamily="font-sans" fontWeight="font-bold" />}
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
    </div>
  );
}
