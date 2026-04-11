/**
 * Serviço de Remoção de Fundo de Imagens
 * 
 * Processa 100% no navegador usando IA - SEM SERVIDOR NECESSÁRIO!
 * Usa a biblioteca @imgly/background-removal que baixa o modelo de IA
 * e processa localmente no browser do usuário.
 */

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

// Cache do estado de carregamento do modelo
let modelLoaded = false;

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
 * Remove o fundo de uma imagem usando IA no navegador.
 * 
 * @param imageSource - String base64 da imagem (com ou sem prefixo data:image...)
 * @param _model - Ignorado (mantido para compatibilidade)
 * @param _backgroundColor - Ignorado (mantido para compatibilidade)
 * @param onProgress - Callback opcional para progresso
 * @returns Data URL da imagem sem fundo ou null em caso de erro
 */
export async function removeBackground(
  imageSource: string, 
  _model: string = 'default',
  _backgroundColor?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string | null> {
  try {
    // Converte base64 para blob
    const blob = base64ToBlob(imageSource, 'image/png');
    
    // Notifica início
    if (onProgress) {
      onProgress(0, modelLoaded ? 'Processando imagem...' : 'Baixando modelo de IA (primeira vez)...');
    }
    
    // Processa com a biblioteca imgly (100% no browser)
    const resultBlob = await imglyRemoveBackground(blob, {
      progress: (key, current, total) => {
        if (onProgress) {
          const percent = Math.round((current / total) * 100);
          if (key === 'compute:inference') {
            onProgress(percent, 'Removendo fundo...');
          } else if (key === 'fetch:model') {
            onProgress(percent, 'Baixando modelo de IA...');
            modelLoaded = true;
          }
        }
      }
    });
    
    // Converte resultado para data URL
    const dataUrl = await blobToDataURL(resultBlob);
    
    if (onProgress) {
      onProgress(100, 'Concluído!');
    }
    
    return dataUrl;
  } catch (error) {
    console.error('Erro ao remover fundo:', error);
    return null;
  }
}

/**
 * Remove o fundo de uma imagem a partir de uma URL.
 */
export async function removeBackgroundFromUrl(
  imageUrl: string,
  _model: string = 'default',
  _backgroundColor?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string | null> {
  try {
    // Busca a imagem
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await blobToDataURL(blob);
    
    // Usa a função principal
    return removeBackground(base64, _model, _backgroundColor, onProgress);
  } catch (error) {
    console.error('Erro ao remover fundo da URL:', error);
    return null;
  }
}

/**
 * Lista os modelos disponíveis (apenas 1 no modo browser).
 */
export async function getAvailableModels(): Promise<string[]> {
  return ['default'];
}

/**
 * Sempre retorna true pois não depende de servidor.
 */
export async function checkApiHealth(): Promise<boolean> {
  return true;
}
