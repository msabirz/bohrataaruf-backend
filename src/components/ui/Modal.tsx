'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-foreground/30 backdrop-blur-sm p-4 pt-[6vh] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background text-muted flex items-center justify-center hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto space-y-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
