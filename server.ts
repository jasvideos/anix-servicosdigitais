import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/remove-background", async (req, res) => {
    try {
      const { imageSource } = req.body;
      if (!imageSource) {
        return res.status(400).json({ error: "Missing imageSource" });
      }

      const apiKey = process.env.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });

      const cleanBase64 = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }, 
            { text: 'Remove the background and return only the subject on pure transparent white background. Return only the image data.' }
          ]
        }
      });

      let bgRemovedImage = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          bgRemovedImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (bgRemovedImage) {
        res.json({ result: bgRemovedImage });
      } else {
        res.status(500).json({ error: "Failed to remove background." });
      }
    } catch (e) {
      console.error("Backend Error:", e);
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Generic RPC endpoint for other Gemini calls
  app.post("/api/gemini-rpc", async (req, res) => {
    try {
      const { method, payload } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });

      let result: any = null;
      
      switch (method) {
         case "numberToWordsIA": {
            const prompt = `Escreva o valor monetário R$ ${payload.amount} por extenso em português do Brasil. Retorne apenas o texto do valor por extenso.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            result = response.text?.trim() || "";
            break;
         }
         case "polishReceiptDescription": {
            const prompt = `Transforme esta descrição simples de serviço em uma frase curta e muito formal para um recibo: "${payload.desc}". Use português do Brasil.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            result = response.text?.trim() || payload.desc;
            break;
         }
         case "analyzeFinanceIA": {
            const prompt = `Analise o seguinte resumo financeiro de uma microempresa (copiadora):
              Saldo Atual: R$ ${payload.balance}
              Últimas Movimentações: ${JSON.stringify(payload.entries)}
              Forneça 3 dicas curtas e práticas em português do Brasil para melhorar a saúde financeira.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            result = response.text || "Continue monitorando suas entradas e saídas.";
            break;
         }
         case "suggestPricingStrategy": {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Sugira um preço de venda para um produto da categoria "${payload.category}" que custa R$ ${payload.cost}. Considere impostos (aprox 6%) e margem de lucro de mercado.`,
              config: { responseMimeType: "application/json" }
            });
            result = JSON.parse(response.text || "{}");
            break;
         }
         case "generateRentalContract": {
            const prompt = `Atue como um advogado especialista em direito imobiliário brasileiro. Gere um contrato de aluguel para Locador ${payload.data.landlordName} e Locatário ${payload.data.tenantName} no imóvel ${payload.data.propertyAddress}. Dados adicionais: Aluguel R$ ${payload.data.rentAmount}, Dia de pagamento ${payload.data.paymentDay}. Use negrito (**) para cláusulas importantes.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { temperature: 0.1 } });
            result = response.text || "Erro ao gerar contrato.";
            break;
         }
         case "generateProfessionalResume": {
            const prompt = `Gere um currículo profissional em Markdown para ${payload.data.fullName}. Dados: ${JSON.stringify(payload.data)}. Foque em resultados e linguagem profissional.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            result = response.text || "Erro ao gerar currículo.";
            break;
         }
         case "suggestResumeSummaries": {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Gere 3 resumos profissionais tom ${payload.tone} para: ${payload.baseInfo}`,
              config: { responseMimeType: "application/json" }
            });
            const parsed = JSON.parse(response.text || "{}");
            result = parsed.suggestions || parsed;
            break;
         }
         case "suggestSkillPhrases": {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Sugira 3 listas de habilidades para: ${payload.baseInfo}`,
              config: { responseMimeType: "application/json" }
            });
            const parsed = JSON.parse(response.text || "{}");
            result = parsed.skills || parsed;
            break;
         }
         case "generateSignImage": {
            const response = await ai.models.generateContent({ 
              model: 'gemini-2.5-flash', 
              contents: { parts: [{ text: payload.prompt }] } 
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) { 
              if (part.inlineData) { result = `data:image/png;base64,${part.inlineData.data}`; break; }
            }
            break;
         }
         case "generateColorPalette": {
            const response = await ai.models.generateContent({ 
              model: "gemini-2.5-flash", 
              contents: `Gere paleta de cores para: ${payload.theme}`, 
              config: { responseMimeType: "application/json" } 
            });
            result = JSON.parse(response.text || "{}");
            break;
         }
         default:
            return res.status(400).json({ error: "Unknown method" });
      }

      res.json({ result });
    } catch (e) {
      console.error("Backend Error:", e);
      res.status(500).json({ error: "Internal server error." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
