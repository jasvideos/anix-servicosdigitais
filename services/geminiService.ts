
import { GoogleGenAI, Type } from "@google/genai";
import { removeBackground } from "@imgly/background-removal";
import { ContractData, ResumeData } from "../types";

// Helper para inicializar o AI com a chave do ambiente de forma segura
const getAI = () => {
  // Tenta obter a chave de múltiplas fontes comuns em builds Vite/Vercel
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
  
  if (!apiKey || apiKey === "undefined") {
    console.error("ERRO CRÍTICO: API_KEY não configurada no Vercel. Adicione em Settings > Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const resizeImage = async (base64Str: string, maxWidth = 1024): Promise<string> => {
  if (typeof window === 'undefined') return base64Str;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;
    img.onload = () => {
      if (img.width <= maxWidth && img.height <= maxWidth) {
        resolve(base64Str);
        return;
      }
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64Str);
  });
};

/**
 * Transforma número em valor por extenso.
 */
export const numberToWordsIA = async (amount: string): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Escreva o valor monetário R$ ${amount} por extenso em português do Brasil. Retorne apenas o texto do valor por extenso.`;
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt 
    });
    return response.text?.trim() || "";
  } catch (err) {
    console.warn("Erro ao converter número para extenso:", err);
    return "";
  }
};

/**
 * Melhora a descrição do recibo para torná-la profissional.
 */
export const polishReceiptDescription = async (desc: string): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Transforme esta descrição simples de serviço em uma frase curta e muito formal para um recibo: "${desc}". Use português do Brasil.`;
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt 
    });
    return response.text?.trim() || desc;
  } catch (err) {
    return desc;
  }
};

/**
 * Analisa o fluxo de caixa e fornece insights estratégicos.
 */
export const analyzeFinanceIA = async (balance: number, entries: any[]): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Analise o seguinte resumo financeiro de uma microempresa (copiadora):
      Saldo Atual: R$ ${balance}
      Últimas Movimentações: ${JSON.stringify(entries)}
      Forneça 3 dicas curtas e práticas em português do Brasil para melhorar a saúde financeira.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Continue monitorando suas entradas e saídas.";
  } catch (err) {
    return "Falha ao processar insights financeiros.";
  }
};

/**
 * Sugere uma estratégia de precificação baseada no custo e categoria.
 */
export const suggestPricingStrategy = async (cost: number, category: string): Promise<any> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira um preço de venda para um produto da categoria "${category}" que custa R$ ${cost}. Considere impostos (aprox 6%) e margem de lucro de mercado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPrice: { type: Type.NUMBER },
            markup: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["suggestedPrice", "markup", "reasoning"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return null;
  }
};

/**
 * Gera um contrato de aluguel completo e formal baseado nos dados fornecidos.
 */
export const generateRentalContract = async (data: ContractData): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Atue como um advogado especialista em direito imobiliário brasileiro. Gere um contrato de aluguel para Locador ${data.landlordName} e Locatário ${data.tenantName} no imóvel ${data.propertyAddress}. Dados adicionais: Aluguel R$ ${data.rentAmount}, Dia de pagamento ${data.paymentDay}. Use negrito (**) para cláusulas importantes.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    return response.text || "Erro ao gerar contrato.";
  } catch (err) {
    return "Erro técnico na comunicação com a IA.";
  }
};

/**
 * Remove o fundo de uma imagem.
 */
export const removeBackgroundAI = async (base64Image: string): Promise<string | null> => {
  try {
    let blob: Blob;

    // Verifica se é Data URL ou Base64 puro e converte para Blob
    if (base64Image.startsWith('data:')) {
      const response = await fetch(base64Image);
      blob = await response.blob();
    } else {
      // Fallback para base64 puro (decodificação manual)
      const byteCharacters = atob(base64Image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/png' });
    }

    // Processamento local (Gratuito e Ilimitado)
    const imageBlob = await removeBackground(blob);
    
    // Converte o resultado de volta para Data URL para uso no app
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error("Erro na remoção de fundo:", error);
    return null;
  }
};

/**
 * Gera um currículo profissional.
 */
export const generateProfessionalResume = async (data: ResumeData): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Gere um currículo profissional em Markdown para ${data.fullName}. Dados: ${JSON.stringify(data)}. Foque em resultados e linguagem profissional.`;
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-preview', 
      contents: prompt 
    });
    return response.text || "Erro ao gerar currículo.";
  } catch (err) {
    return "Erro técnico.";
  }
};

export const suggestResumeSummaries = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere 3 resumos profissionais tom ${tone} para: ${baseInfo}`,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.OBJECT, 
          properties: { 
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } 
          },
          required: ["suggestions"]
        } 
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return parsed.suggestions || [];
  } catch (e) { return []; }
};

export const suggestSkillPhrases = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sugira 3 listas de habilidades para: ${baseInfo}`,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.OBJECT, 
          properties: { 
            skills: { type: Type.ARRAY, items: { type: Type.STRING } } 
          },
          required: ["skills"]
        } 
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return parsed.skills || [];
  } catch (e) { return []; }
};

export const generateSignImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
      model: 'imagen-3.0-generate-001', 
      contents: { parts: [{ text: prompt }] } 
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; 
    }
    return null;
  } catch (e) { 
    console.error("Erro na geração de imagem:", e);
    throw e; 
  }
};

export const generateColorPalette = async (theme: string): Promise<any> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: `Gere paleta de cores para: ${theme}`, 
      config: { 
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.OBJECT, 
          properties: { 
            palette: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  hex: { type: Type.STRING }, 
                  name: { type: Type.STRING }, 
                  usage: { type: Type.STRING } 
                },
                required: ["hex", "name", "usage"]
              } 
            } 
          },
          required: ["palette"]
        } 
      } 
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { return { palette: [] }; }
};
