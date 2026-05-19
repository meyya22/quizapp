import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;

  return (
    <Fragment>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
        </div>
      </div>
    </Fragment>
  );
}
