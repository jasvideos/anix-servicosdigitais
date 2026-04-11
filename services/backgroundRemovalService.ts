/**
 * Serviço de Remoção de Fundo de Imagens
 * 
 * Usa a API dedicada de remoção de fundo baseada em IA (rembg).
 * API hospedada no Render: https://background-removal-api-dlf8.onrender.com
 */

const API_URL = import.meta.env.VITE_BG_REMOVAL_API || 'https://background-removal-api-dlf8.onrender.com';

/**
 * Converte uma string base64 para um Blob
 */
function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  // Remove o prefixo data:image/...;base64, se existir
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Converte um Blob para uma string base64 data URL
 */
async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Remove o fundo de uma imagem usando a API dedicada.
 * 
 * @param imageSource - String base64 da imagem (com ou sem prefixo data:image...)
 * @param model - Modelo de IA a usar (padrão: u2net)
 *                Opções: u2net, u2netp (rápido), u2net_human_seg (pessoas), 
 *                        isnet-general-use, isnet-anime
 * @param backgroundColor - Cor de fundo opcional (hex, ex: "#FFFFFF" para branco)
 * @returns Data URL da imagem sem fundo ou null em caso de erro
 */
export async function removeBackground(
  imageSource: string, 
  model: string = 'u2net',
  backgroundColor?: string
): Promise<string | null> {
  try {
    // Converte base64 para blob
    const blob = base64ToBlob(imageSource, 'image/png');
    
    // Prepara o FormData
    const formData = new FormData();
    formData.append('image', blob, 'image.png');
    formData.append('model', model);
    formData.append('format', 'png');
    
    if (backgroundColor) {
      formData.append('bgcolor', backgroundColor);
    }
    
    // Envia para a API
    const response = await fetch(`${API_URL}/remove-background`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      console.error('Erro na API de remoção de fundo:', response.status, response.statusText);
      return null;
    }
    
    // Converte a resposta (image/png) para data URL base64
    const resultBlob = await response.blob();
    const dataUrl = await blobToDataURL(resultBlob);
    
    return dataUrl;
  } catch (error) {
    console.error('Erro ao remover fundo:', error);
    return null;
  }
}

/**
 * Remove o fundo de uma imagem a partir de uma URL.
 * 
 * @param imageUrl - URL da imagem
 * @param model - Modelo de IA a usar
 * @param backgroundColor - Cor de fundo opcional
 * @returns Data URL da imagem sem fundo ou null em caso de erro
 */
export async function removeBackgroundFromUrl(
  imageUrl: string,
  model: string = 'u2net',
  backgroundColor?: string
): Promise<string | null> {
  try {
    const body: Record<string, string> = {
      url: imageUrl,
      model: model,
      format: 'png',
    };
    
    if (backgroundColor) {
      body.bgcolor = backgroundColor;
    }
    
    const response = await fetch(`${API_URL}/remove-background-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error('Erro na API de remoção de fundo:', response.status, response.statusText);
      return null;
    }
    
    const resultBlob = await response.blob();
    const dataUrl = await blobToDataURL(resultBlob);
    
    return dataUrl;
  } catch (error) {
    console.error('Erro ao remover fundo da URL:', error);
    return null;
  }
}

/**
 * Lista os modelos disponíveis na API.
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/models`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Verifica se a API está disponível.
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api`);
    return response.ok;
  } catch {
    return false;
  }
}
