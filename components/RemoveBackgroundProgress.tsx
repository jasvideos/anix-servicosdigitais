/**
 * Componente de barra de progresso para remoção de fundo.
 * 
 * Uso:
 * <RemoveBackgroundProgress 
 *   isProcessing={isProcessing} 
 *   progress={progress} 
 *   message={progressMessage} 
 * />
 */

import React from 'react';

interface RemoveBackgroundProgressProps {
  isProcessing: boolean;
  progress: number;
  message: string;
}

export const RemoveBackgroundProgress: React.FC<RemoveBackgroundProgressProps> = ({
  isProcessing,
  progress,
  message
}) => {
  if (!isProcessing) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '12px',
      padding: '16px 24px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      zIndex: 9999,
      minWidth: '300px',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
      </div>
      
      <div style={{
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        opacity: 0.7,
        marginTop: '6px'
      }}>
        {progress}%
      </div>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RemoveBackgroundProgress;
