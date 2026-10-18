import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  const getIcon = () => {
    if (type === 'success') return <CheckCircle2 size={18} />;
    if (type === 'error') return <AlertCircle size={18} />;
    return <Info size={18} />;
  };

  return (
    <div className={`toast toast-${type}`}>
      {getIcon()}
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

