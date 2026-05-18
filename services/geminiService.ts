
import { ContractData, ResumeData } from "../types";

const rpcCall = async (method: string, payload: any) => {
  try {
    const res = await fetch("/api/gemini-rpc", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ method, payload })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error("Erro no RPC:", error);
    throw error;
  }
};

export const numberToWordsIA = async (amount: string): Promise<string> => {
  try { return await rpcCall("numberToWordsIA", { amount }) || ""; } catch { return ""; }
};

export const polishReceiptDescription = async (desc: string): Promise<string> => {
  try { return await rpcCall("polishReceiptDescription", { desc }) || desc; } catch { return desc; }
};

export const analyzeFinanceIA = async (balance: number, entries: any[]): Promise<string> => {
  try { return await rpcCall("analyzeFinanceIA", { balance, entries }) || "Continue monitorando."; } catch { return "Erro."; }
};

export const suggestPricingStrategy = async (cost: number, category: string): Promise<any> => {
  try { return await rpcCall("suggestPricingStrategy", { cost, category }); } catch { return null; }
};

export const generateRentalContract = async (data: ContractData): Promise<string> => {
  try { return await rpcCall("generateRentalContract", { data }) || "Erro."; } catch { return "Erro."; }
};

export const removeBackgroundAI = async (imageSource: string): Promise<string | null> => {
  try {
    const res = await fetch("/api/remove-background", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ imageSource })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch { return null; }
};

export const generateProfessionalResume = async (data: ResumeData): Promise<string> => {
  try { return await rpcCall("generateProfessionalResume", { data }) || "Erro."; } catch { return "Erro."; }
};

export const suggestResumeSummaries = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  try { return await rpcCall("suggestResumeSummaries", { baseInfo, tone }) || []; } catch { return []; }
};

export const suggestSkillPhrases = async (baseInfo: string, tone: string = 'Profissional'): Promise<string[]> => {
  try { return await rpcCall("suggestSkillPhrases", { baseInfo, tone }) || []; } catch { return []; }
};

export const generateSignImage = async (prompt: string): Promise<string | null> => {
  try { return await rpcCall("generateSignImage", { prompt }); } catch { return null; }
};

export const generateColorPalette = async (theme: string): Promise<any> => {
  try { return await rpcCall("generateColorPalette", { theme }) || { palette: [] }; } catch { return { palette: [] }; }
};
