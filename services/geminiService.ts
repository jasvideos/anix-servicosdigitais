
import { GoogleGenAI, Type } from "@google/genai";
import { ContractData, ResumeData } from "../types";

/**
 * Transforma número em valor por extenso.
 */
export const numberToWordsIA = async (amount: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Escreva o valor monetário R$ ${amount} por extenso em português do Brasil. Retorne apenas o texto do valor por extenso.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text?.trim() || "";
  } catch (err) {
    return "";
  }
};

/**
 * Melhora a descrição do recibo para torná-la profissional.
 */
export const polishReceiptDescription = async (desc: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Transforme esta descrição simples de serviço em uma frase curta e muito formal para um recibo: "${desc}". Use português do Brasil.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text?.trim() || desc;
  } catch (err) {
    return desc;
  }
};

/**
 * Analisa o fluxo de caixa e fornece insights estratégicos.
 */
export const analyzeFinanceIA = async (balance: number, entries: any[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise o seguinte resumo financeiro de uma microempresa (copiadora):
    Saldo Atual: R$ ${balance}
    Últimas Movimentações: ${JSON.stringify(entries)}
    Forneça 3 dicas curtas e práticas em português do Brasil para melhorar a saúde financeira.`;

  try {
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
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
    return JSON.parse(response.text);
  } catch (err) {
    return null;
  }
};

/**
 * Gera um contrato de aluguel completo e formal baseado nos dados fornecidos.
 */
export const generateRentalContract = async (data: ContractData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Atue como um advogado especialista em direito imobiliário brasileiro. Gere um contrato de aluguel para Locador ${data.landlordName} e Locatário ${data.tenantName} no imóvel ${data.propertyAddress}. Use negrito (**) para cláusulas importantes.`;
  try {
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: 'Remove the background and return only the subject on pure white.' }]
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Gera um currículo profissional.
 */
export const generateProfessionalResume = async (data: ResumeData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Gere um currículo profissional em Markdown para ${data.fullName}. Foque em resultados e linguagem profissional.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Erro ao gerar currículo.";
  } catch (err) {
    return "Erro técnico.";
  }
};

export const suggestResumeSummaries = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere 3 resumos profissionais tom ${tone} para: ${baseInfo}`,
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
  });
  return JSON.parse(response.text).suggestions;
};

export const suggestSkillPhrases = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Sugira 3 listas de habilidades para: ${baseInfo}`,
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { skills: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
  });
  return JSON.parse(response.text).skills;
};

export const generateSignImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] } });
  for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
  return null;
};

export const generateColorPalette = async (theme: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: `Gere paleta de cores para: ${theme}`, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { palette: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING }, usage: { type: Type.STRING } } } } } } } });
  return JSON.parse(response.text);
};
