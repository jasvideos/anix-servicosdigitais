/**
 * Hook React para remoção de fundo com progresso visual.
 * 
 * Uso:
 * const { removeBackground, isProcessing, progress, progressMessage } = useRemoveBackground();
 * 
 * const handleRemove = async () => {
 *   const result = await removeBackground(imageBase64);
 *   if (result) setImage(result);
 * };
 */

import { useState, useCallback } from 'react';
import { 
  removeBackground as removeBg, 
  preloadModel, 
  isModelLoaded,
  type ProgressCallback 
} from './backgroundRemovalService';

export interface UseRemoveBackgroundResult {
  /** Remove o fundo de uma imagem base64 */
  removeBackground: (imageSource: string) => Promise<string | null>;
  /** Indica se está processando */
  isProcessing: boolean;
  /** Progresso de 0 a 100 */
  progress: number;
  /** Mensagem de progresso atual */
  progressMessage: string;
  /** Pré-carrega o modelo (opcional, melhora primeira execução) */
  preload: () => Promise<void>;
  /** Indica se o modelo já está carregado */
  isModelReady: boolean;
}

export function useRemoveBackground(): UseRemoveBackgroundResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());

  const handleProgress: ProgressCallback = useCallback((prog, message) => {
    setProgress(prog);
    setProgressMessage(message);
  }, []);

  const removeBackground = useCallback(async (imageSource: string): Promise<string | null> => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Iniciando...');
    
    try {
      const result = await removeBg(imageSource, 'default', undefined, handleProgress);
      return result;
    } finally {
      setIsProcessing(false);
      setIsModelReady(true);
    }
  }, [handleProgress]);

  const preload = useCallback(async () => {
    setProgressMessage('Pré-carregando modelo...');
    await preloadModel();
    setIsModelReady(true);
    setProgressMessage('');
  }, []);

  return {
    removeBackground,
    isProcessing,
    progress,
    progressMessage,
    preload,
    isModelReady
  };
}

export default useRemoveBackground;
