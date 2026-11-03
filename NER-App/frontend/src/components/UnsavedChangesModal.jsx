import React, { useEffect } from 'react';
import { AlertCircle, Check, Loader2, RotateCcw, X } from 'lucide-react';

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onSaveAndProceed,
  onDiscardAndProceed,
  isSaving = false,
  targetPageNumber = null,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-lg border border-rule bg-sheet p-6 shadow-xl transition-all">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute right-4 top-4 rounded-md p-1 text-ink-faint transition hover:bg-paper hover:text-ink disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-hand/10 text-hand">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="unsaved-modal-title" className="text-[16px] font-semibold text-ink">
              Unsaved Changes
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              You have made changes to the annotations on this page. Make sure you save or discard them before moving to {targetPageNumber ? `page ${targetPageNumber}` : 'the next page'}.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-rule bg-sheet px-3.5 py-2 text-[13px] font-medium text-ink-soft transition hover:border-rule-strong hover:bg-paper hover:text-ink disabled:opacity-40"
          >
            Stay on page
          </button>
          <button
            type="button"
            onClick={onDiscardAndProceed}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-rule bg-sheet px-3.5 py-2 text-[13px] font-medium text-hand transition hover:border-hand/40 hover:bg-hand/5 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Discard changes</span>
          </button>
          <button
            type="button"
            onClick={onSaveAndProceed}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/90 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Approve & Save All</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
