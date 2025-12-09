import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './CustomLogoModal.css';

interface CustomLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  initialUrl?: string;
}

export const CustomLogoModal: React.FC<CustomLogoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialUrl = ''
}) => {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConfirm(url.trim());
    }
  };

  return (
    <div className="custom-logo-modal-overlay" onClick={onClose}>
      <div className="custom-logo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-logo-modal-header">
          <h3>Custom Logo URL</h3>
          <button className="custom-logo-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="custom-logo-modal-content">
          <div className="custom-logo-modal-field">
            <label htmlFor="logo-url">Logo URL</label>
            <input
              id="logo-url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="custom-logo-modal-input"
              autoFocus
            />
            <p className="custom-logo-modal-hint">
              Enter a direct URL to an image file (PNG, JPG, or SVG)
            </p>
          </div>

          <div className="custom-logo-modal-actions">
            <button
              type="button"
              className="custom-logo-modal-btn custom-logo-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="custom-logo-modal-btn custom-logo-modal-btn-confirm"
              disabled={!url.trim()}
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};




















