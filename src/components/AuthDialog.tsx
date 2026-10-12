import { useEffect, useRef } from 'react';
import { AuthModal } from './AuthModal';

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input[type="password"]')?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="auth-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-0 backdrop:bg-slate-900/50"
    >
      <AuthModal onClose={onClose} />
    </dialog>
  );
}
