
import React, { useState, useRef, useEffect } from 'react';
import { generateSignImage } from '../services/geminiService';

type BankTemplate = 'NUBANK' | 'ITAU' | 'BB' | 'PIX_STANDARD' | 'SANTANDER' | 'CAIXA' | 'MERCADO_PAGO' | 'BRADESCO' | 'PICPAY';

interface TemplateStyle {
  text: string;
  name: string;
  colorHex: string;
  isCustomLayout?: boolean;
}

// URL da imagem de marca d'água fornecida (abstrata com quadrados)
const WATERMARK_IMAGE_URL = "https://i.ibb.co/3ykG4V6/bg-premium.png";

const QRCodePlateGenerator: React.FC = () => {
  const templates: Record<BankTemplate, TemplateStyle> = {
    NUBANK: { text: 'text-white', name: 'Nubank', colorHex: '#820ad1' },
    ITAU: { text: 'text-white', name: 'Itaú', colorHex: '#F28500' },
    BB: { text: 'text-[#003399]', name: 'B. Brasil', colorHex: '#fcfc30' },
    SANTANDER: { text: 'text-white', name: 'Santander', colorHex: '#EC0000' },
    CAIXA: { text: 'text-white', name: 'Caixa', colorHex: '#005ca9' },
    MERCADO_PAGO: { text: 'text-white', name: 'M. Pago', colorHex: '#009ee3' },
    BRADESCO: { text: 'text-white', name: 'Bradesco', colorHex: '#CC092F' },
    PICPAY: { text: 'text-white', name: 'PicPay', colorHex: '#11c76f' },
    PIX_STANDARD: { text: 'text-white', name: 'PIX Padrão', colorHex: '#0058D1', isCustomLayout: true }
  };

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [template, setTemplate] = useState<BankTemplate>('PIX_STANDARD');
  const [bgColor, setBgColor] = useState(templates['PIX_STANDARD'].colorHex);
  
  const [hasBorder, setHasBorder] = useState(false);
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidthMm, setBorderWidthMm] = useState(2);

  const [bgSearchQuery, setBgSearchQuery] = useState('');
  const [isProcessingIA, setIsProcessingIA] = useState(false);

  const plateRef = useRef<HTMLDivElement>(null);

  // Atualiza a cor de fundo quando o template muda
  const handleTemplateChange = (tpl: BankTemplate) => {
    setTemplate(tpl);
    setBgColor(templates[tpl].colorHex);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQrCode(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBgImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSearchBgIA = async () => {
    if (!bgSearchQuery.trim()) return;
    setIsProcessingIA(true);
    try {
      const result = await generateSignImage(`${bgSearchQuery} background texture for professional business display, elegant, clean`);
      if (result) {
        setBgImage(result);
      } else {
        alert("Não foi possível gerar uma imagem para esse fundo.");
      }
    } catch (err) {
      alert("Falha técnica ao gerar fundo com IA.");
    } finally {
      setIsProcessingIA(false);
    }
  };

  const currentTpl = templates[template];

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const saveAsPNG = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 10x15cm em 300 DPI (Aprox 1181x1772 pixels)
    canvas.width = 1181;
    canvas.height = 1772;

    const drawPremiumWatermark = (callback: () => void) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        callback();
      };
      img.onerror = () => callback();
      img.src = WATERMARK_IMAGE_URL;
    };

    const drawRestOfCanvas = () => {
      // Contorno com recuo de 10px
      if (hasBorder) {
        const offset = 10;
        ctx.strokeStyle = borderColor;
        const pxWidth = borderWidthMm * 11.81;
        ctx.lineWidth = pxWidth;
        ctx.strokeRect(offset + pxWidth/2, offset + pxWidth/2, canvas.width - (2 * offset) - pxWidth, canvas.height - (2 * offset) - pxWidth);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (template === 'PIX_STANDARD' && !bgImage) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 85px Inter, sans-serif';
        ctx.fillText('PAGUE COM', canvas.width / 2, 160);
        ctx.font = 'black 180px Inter, sans-serif';
        ctx.fillText('PIX', canvas.width / 2 + 60, 350);
        ctx.save();
        ctx.translate(canvas.width / 2 - 200, 350);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#FFFFFF';
        const s = 60;
        ctx.fillRect(-s, -s, s, s);
        ctx.fillRect(5, -s, s, s);
        ctx.fillRect(-s, 5, s, s);
        ctx.fillRect(5, 5, s, s);
        ctx.restore();
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = (bgColor.toLowerCase() === '#fcfc30' && !bgImage) ? '#003399' : '#FFFFFF';
        ctx.font = 'italic 900 100px Inter, sans-serif';
        ctx.fillText(currentTpl.name.toUpperCase(), canvas.width / 2, 220);
        ctx.shadowBlur = 0;
        ctx.font = 'bold 65px Inter, sans-serif';
        ctx.fillText('PAGUE VIA PIX', canvas.width / 2, 380);
      }

      if (qrCode) {
        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = 650;
          const x = (canvas.width - qrSize) / 2;
          const y = 550;
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 40;
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.rect(x - 35, y - 35, qrSize + 70, qrSize + 70);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.drawImage(qrImg, x, y, qrSize, qrSize);

          if (pixKey.trim()) {
            const keyLines = pixKey.split('\n');
            const keyBoxY = 1380;
            const keyBoxW = 950;
            // Ajusta a altura da caixa dinamicamente com base no número de linhas
            const keyBoxH = Math.max(240, (keyLines.length * 60) + 80);
            const kX = (canvas.width - keyBoxW) / 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            if ((ctx as any).roundRect) (ctx as any).roundRect(kX, keyBoxY, keyBoxW, keyBoxH, 20);
            else ctx.rect(kX, keyBoxY, keyBoxW, keyBoxH);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF'; 
            ctx.font = 'bold 42px Inter, sans-serif';
            ctx.fillText('CHAVE PIX', canvas.width / 2, keyBoxY + 55);
            
            const lineFontSize = keyLines.length > 3 ? 45 : 60;
            const lineHeight = lineFontSize + 15;
            ctx.font = `bold ${lineFontSize}px Inter, sans-serif`;
            
            keyLines.forEach((line, index) => {
              ctx.fillText(line.trim(), canvas.width / 2, keyBoxY + 130 + (index * lineHeight), keyBoxW - 60);
            });
          }

          const link = document.createElement('a');
          link.download = `placa-pix-${currentTpl.name.toLowerCase()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        qrImg.src = qrCode;
      }
    };

    const runRender = () => {
        if (template !== 'PIX_STANDARD' && !bgImage) {
            drawPremiumWatermark(drawRestOfCanvas);
        } else {
            drawRestOfCanvas();
        }
    };

    if (bgImage) {
      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.onload = () => {
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = bgImg.width / bgImg.height;
        let drawWidth, drawHeight, offsetX, offsetY;
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = bgImg.width * (canvas.height / bgImg.height);
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = bgImg.height * (canvas.width / bgImg.width);
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        }
        ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
        runRender();
      };
      bgImg.src = bgImage;
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (template === 'PIX_STANDARD') {
        ctx.fillStyle = '#35D31D';
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height + 150, canvas.width * 0.9, 650, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      runRender();
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-12">
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 no-print space-y-8">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Configurar Cartão PIX</h2>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Estilo do Banco</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(templates) as BankTemplate[]).map((tpl) => (
                <button 
                  key={tpl} 
                  onClick={() => handleTemplateChange(tpl)} 
                  className={`px-2 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-tighter ${template === tpl ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md scale-95' : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                >
                  {templates[tpl].name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">QR Code de Pagamento</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-colors group">
              <div className="text-center">
                <svg className="w-6 h-6 mx-auto mb-2 text-slate-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01" />
                </svg>
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Anexar QR Code (Obrigatório)</span>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Dados PIX (Multilinha permitido)</label>
            <textarea 
              rows={3}
              value={pixKey} 
              onChange={(e) => setPixKey(e.target.value)} 
              placeholder="Chave PIX&#10;Nome do Beneficiário&#10;Banco" 
              className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold shadow-inner resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Cor de Fundo</label>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 h-[60px]">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" title="Alterar cor de fundo" />
                    <input type="text" value={bgColor.toUpperCase()} onChange={(e) => setBgColor(e.target.value)} className="flex-1 bg-transparent font-black text-xs outline-none" placeholder="#HEX" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Contorno (10px da borda)</label>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 h-[60px]">
                    <input type="checkbox" checked={hasBorder} onChange={(e) => setHasBorder(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} disabled={!hasBorder} className="w-8 h-8 rounded-lg cursor-pointer disabled:opacity-30" title="Cor do contorno" />
                    <input type="number" min="1" max="20" value={borderWidthMm} onChange={(e) => setBorderWidthMm(Number(e.target.value))} disabled={!hasBorder} className="w-10 bg-transparent font-bold text-xs disabled:opacity-30" title="Largura em mm" />
                    <span className="text-[8px] font-black text-slate-400 uppercase">mm</span>
                </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Textura / Imagem de Fundo</label>
            <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="relative group">
                  <input 
                    type="text" 
                    value={bgSearchQuery} 
                    onChange={(e) => setBgSearchQuery(e.target.value)} 
                    placeholder="Pesquise textura com IA (ex: 'carbono', 'luxo')..." 
                    className="w-full border border-slate-200 bg-white rounded-xl pl-4 pr-12 py-3 outline-none font-bold text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBgIA()}
                  />
                  <button 
                    onClick={handleSearchBgIA} 
                    disabled={isProcessingIA}
                    className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessingIA ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    )}
                  </button>
               </div>
               <div className="flex gap-2">
                 <label className="flex-1 bg-white border border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-center cursor-pointer transition-all">
                    Upload de Imagem
                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                 </label>
                 {bgImage && (
                   <button onClick={() => { setBgImage(null); setBgSearchQuery(''); }} className="px-4 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors font-black text-[9px] uppercase tracking-widest">
                     Remover
                   </button>
                 )}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={handlePrint} className="bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all">Imprimir</button>
            <button onClick={saveAsPNG} className="bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all">Salvar PNG</button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col no-print">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Preview 10x15</h2>
          <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">Toque para baixar o arquivo pronto</p>
        </div>
        <div className="flex justify-center items-start">
          <div 
            ref={plateRef}
            onClick={saveAsPNG}
            title="Clique para salvar como PNG"
            style={{
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundColor: (bgImage || template === 'PIX_STANDARD') ? 'transparent' : bgColor,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxSizing: 'border-box'
            }}
            className={`w-[100mm] h-[150mm] rounded-none shadow-2xl flex flex-col items-center px-8 py-10 relative overflow-hidden cursor-pointer active:scale-[0.99] transition-all duration-500 ${template === 'PIX_STANDARD' && !bgImage ? 'bg-transparent' : ''}`}
          >
            {/* Background Especial para PIX_STANDARD */}
            {template === 'PIX_STANDARD' && !bgImage && (
                <div 
                    style={{ backgroundColor: bgColor }} 
                    className="absolute inset-0 z-0"
                >
                    <div className="absolute bottom-[-150px] left-[-50%] w-[200%] h-[450px] bg-[#35D31D] rounded-[100%] opacity-90 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"></div>
                </div>
            )}

            {/* Marca d'água oficial (Exceção: PIX Padrão) */}
            {!bgImage && template !== 'PIX_STANDARD' && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.08] select-none z-0" 
                style={{ 
                    backgroundImage: `url(${WATERMARK_IMAGE_URL})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    mixBlendMode: 'overlay'
                }} 
              />
            )}

            {/* Borda no Preview */}
            {hasBorder && (
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  right: '10px',
                  bottom: '10px',
                  border: `${borderWidthMm}mm solid ${borderColor}`,
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              />
            )}

            {bgImage && <div className="absolute inset-0 bg-black/15 z-0"></div>}
            
            <div className="mt-4 flex flex-col justify-center items-center w-full z-10">
              {template === 'PIX_STANDARD' && !bgImage ? (
                <div className="text-center space-y-2">
                  <span className="text-2xl font-black tracking-tight text-white drop-shadow-sm uppercase">PAGUE COM</span>
                  <div className="flex items-center justify-center gap-3">
                    <div className="grid grid-cols-2 gap-0.5 rotate-45">
                      <div className="w-4 h-4 bg-white"></div>
                      <div className="w-4 h-4 bg-white"></div>
                      <div className="w-4 h-4 bg-white"></div>
                      <div className="w-4 h-4 bg-white"></div>
                    </div>
                    <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-md">PIX</span>
                  </div>
                </div>
              ) : (
                <span className={`text-4xl font-black italic tracking-tighter uppercase ${bgColor.toLowerCase() === '#fcfc30' && !bgImage ? 'text-[#003399]' : 'text-white'} drop-shadow-md`}>
                  {currentTpl.name}
                </span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
              {template !== 'PIX_STANDARD' && (
                <h1 className={`text-xl font-black ${bgColor.toLowerCase() === '#fcfc30' && !bgImage ? 'text-[#003399]' : 'text-white'} uppercase mb-8 tracking-[0.2em] text-center drop-shadow-sm`}>PAGUE VIA PIX</h1>
              )}
              
              <div className={`bg-white p-6 shadow-xl w-64 h-64 flex items-center justify-center overflow-hidden border-2 border-white/50 ${template === 'PIX_STANDARD' ? 'rounded-none mt-4' : 'rounded-xl'}`}>
                {qrCode ? (
                  <img src={qrCode} className="w-full h-full object-contain" alt="QR" />
                ) : (
                  <div className="text-slate-200 text-[9px] font-black uppercase opacity-20 text-center px-4">Anexe o QR Code para visualizar</div>
                )}
              </div>
              
              {pixKey.trim() && (
                <div className="w-full mt-8 animate-fade-in">
                  <div className="w-full py-5 px-6 rounded-xl text-center bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl">
                    <p className="text-[9px] font-black uppercase mb-1 opacity-80 text-white tracking-[0.2em]">CHAVE PIX</p>
                    <p className="text-[13px] font-black leading-tight text-white tracking-tight whitespace-pre-wrap">{pixKey}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePlateGenerator;
