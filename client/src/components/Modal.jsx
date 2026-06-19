/**
 * Modal — a reusable dialog. Click the backdrop or press Escape to close.
 * Children are the dialog body (usually a form).
 */

import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal__overlay" onClick={onClose}>
      {/* stopPropagation so clicks inside the dialog don't close it */}
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
