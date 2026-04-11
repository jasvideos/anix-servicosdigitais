/**
 * Serviço de Remoção de Fundo de Imagens
 * 
 * Processa 100% no navegador usando IA - SEM SERVIDOR NECESSÁRIO!
 * Usa a biblioteca @imgly/background-removal que baixa o modelo de IA
 * e processa localmente no browser do usuário.
 * 
 * Recursos:
 * - Preload do modelo em background
 * - Cache de resultados (evita reprocessar mesma imagem)
 * - Callback de progresso para UI
 */

import { removeBackground as imglyRemoveBackground, preload } from '@imgly/background-removal';

// Estado do modelo
let modelLoaded = false;
let modelLoading = false;
let preloadPromise: Promise<void> | null = null;

// Cache de resultados (máximo 10 imagens)
const resultCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10;

/**
 * Pré-carrega o modelo de IA em background.
 * Chame isso no início do app para acelerar o primeiro uso.
 */
export async function preloadModel(): Promise<void> {
  if (modelLoaded || modelLoading) return preloadPromise || Promise.resolve();
  
  modelLoading = true;
  preloadPromise = preload({
    progress: (key, current, total) => {
      if (key === 'fetch:model' && current === total) {
        modelLoaded = true;
        modelLoading = false;
      }
    }
  }).then(() => {
    modelLoaded = true;
    modelLoading = false;
  }).catch(() => {
    modelLoading = false;
  });
  
  return preloadPromise;
}

/**
 * Verifica se o modelo já está carregado.
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Gera um hash simples para usar como chave de cache.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Converte uma string base64 para um Blob
 */
function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
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

export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Remove o fundo de uma imagem usando IA no navegador.
 * 
 * @param imageSource - String base64 da imagem (com ou sem prefixo data:image...)
 * @param options - Opções de processamento
 * @returns Data URL da imagem sem fundo ou null em caso de erro
 */
export async function removeBackground(
  imageSource: string, 
  _model: string = 'default',
  _backgroundColor?: string,
  onProgress?: ProgressCallback
): Promise<string | null> {
  try {
    // Verifica cache
    const cacheKey = hashString(imageSource);
    if (resultCache.has(cacheKey)) {
      onProgress?.(100, 'Usando resultado do cache!');
      return resultCache.get(cacheKey)!;
    }
    
    // Converte base64 para blob
    const blob = base64ToBlob(imageSource, 'image/png');
    
    // Notifica início
    onProgress?.(0, modelLoaded ? 'Iniciando processamento...' : 'Baixando modelo de IA (apenas na primeira vez)...');
    
    // Processa com a biblioteca imgly (100% no browser)
    const resultBlob = await imglyRemoveBackground(blob, {
      progress: (key, current, total) => {
        if (onProgress) {
          const percent = Math.round((current / total) * 100);
          if (key === 'compute:inference') {
            onProgress(50 + percent * 0.5, 'Removendo fundo...');
          } else if (key === 'fetch:model') {
            onProgress(percent * 0.5, 'Baixando modelo de IA...');
            if (current === total) modelLoaded = true;
          }
        }
      }
    });
    
    // Converte resultado para data URL
    const dataUrl = await blobToDataURL(resultBlob);
    
    // Salva no cache (remove item mais antigo se necessário)
    if (resultCache.size >= MAX_CACHE_SIZE) {
      const firstKey = resultCache.keys().next().value;
      if (firstKey) resultCache.delete(firstKey);
    }
    resultCache.set(cacheKey, dataUrl);
    
    onProgress?.(100, 'Concluído!');
    
    return dataUrl;
  } catch (error) {
    console.error('Erro ao remover fundo:', error);
    onProgress?.(0, 'Erro ao processar imagem');
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
  onProgress?: ProgressCallback
): Promise<string | null> {
  try {
    onProgress?.(0, 'Baixando imagem...');
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await blobToDataURL(blob);
    
    return removeBackground(base64, _model, _backgroundColor, onProgress);
  } catch (error) {
    console.error('Erro ao remover fundo da URL:', error);
    return null;
  }
}

/**
 * Limpa o cache de resultados.
 */
export function clearCache(): void {
  resultCache.clear();
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
