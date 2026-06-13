import { X } from 'lucide-react';
import { Button } from './Button';

export type ToastMessage = {
  id: string;
  message: string;
  tone?: 'success' | 'error' | 'info';
};

const toneClass: Record<NonNullable<ToastMessage['tone']>, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-green-200 bg-green-50 text-green-700',
};

export function Toast({
  onDismiss,
  toast,
}: {
  onDismiss: (id: string) => void;
  toast: ToastMessage;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-sm ${toneClass[toast.tone ?? 'info']}`}>
      <span className="min-w-0 flex-1">{toast.message}</span>
      <Button
        aria-label="Tutup toast"
        className="size-7 px-0"
        icon={<X className="size-4" />}
        onClick={() => onDismiss(toast.id)}
        variant="ghost"
      >
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}

export function ToastStack({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: string) => void;
  toasts: ToastMessage[];
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  );
}
