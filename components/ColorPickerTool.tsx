
import React, { useState, useRef, useEffect } from 'react';
import { generateColorPalette } from '../services/geminiService';

interface PaletteColor {
  hex: string;
  name: string;
  usage: string;
}

const ColorPickerTool: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string>('#6366f1');
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiTheme, setAiTheme] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx?.drawImage(img, 0, 0);

    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;

    const pixelData = ctx?.getImageData(x, y, 1, 1).data;
    if (pixelData) {
      const hex = `#${((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1).toUpperCase()}`;
      setPickedColor(hex);
    }
  };

  const handleAiPalette = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTheme.trim()) return;
    setIsLoading(true);
    try {
      const result = await generateColorPalette(aiTheme);
      setPalette(result.palette);
    } catch (err) {
      alert("Erro ao gerar paleta com IA.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Setor de Cores IA</h2>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em]">Identificação Cromática e Design</p>
        </div>
        <div className="flex gap-4">
          <label className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black cursor-pointer transition-all">
            Analisar Foto
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] flex items-center justify-center overflow-hidden">
            {image ? (
              <img 
                ref={imageRef}
                src={image} 
                onClick={handleImageClick}
                className="max-w-full max-h-[600px] object-contain rounded-2xl cursor-crosshair shadow-2xl" 
                alt="Análise" 
              />
            ) : (
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Carregue uma imagem para extrair cores</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Cor Selecionada</h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-[2rem] shadow-2xl border-4 border-white" style={{ backgroundColor: pickedColor }}></div>
              <div className="space-y-1">
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{pickedColor}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código HEX</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 space-y-6">
            <h3 className="text-white text-xs font-black uppercase tracking-widest">Paleta Inteligente IA</h3>
            <form onSubmit={handleAiPalette} className="relative">
              <input 
                type="text" 
                value={aiTheme}
                onChange={(e) => setAiTheme(e.target.value)}
                placeholder="Ex: Pastel, Confeitaria, Moderno..."
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-white/40 focus:ring-2 focus:ring-white outline-none"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="absolute right-2 top-2 bg-white text-indigo-600 px-6 py-2 rounded-xl font-black uppercase text-[9px] shadow-lg disabled:opacity-50"
              >
                {isLoading ? '...' : 'Gerar'}
              </button>
            </form>

            {palette.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-4">
                {palette.map((p, i) => (
                  <div key={i} className="space-y-2 group cursor-pointer" onClick={() => setPickedColor(p.hex)}>
                    <div className="aspect-square rounded-xl shadow-lg border-2 border-white/20" style={{ backgroundColor: p.hex }}></div>
                    <p className="text-[7px] font-black text-white/60 uppercase tracking-tighter truncate text-center">{p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ColorPickerTool;
