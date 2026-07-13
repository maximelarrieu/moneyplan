"use client";

import * as React from "react";
import { Button } from "./button";

/*
 * Confirmation interne (remplace window.confirm) : rendue dans le design de
 * l'app, au-dessus de tout (y compris un Dialog déjà ouvert). Échap ou clic
 * sur le fond = annuler.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // ne pas fermer aussi le dialog parent
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm border border-edge bg-surface p-5 shadow-xl">
        <p className="font-serif text-lg text-ink">{title}</p>
        {description && <p className="mt-1.5 text-sm text-ink-2">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            ref={confirmRef}
            variant={danger ? "danger" : "primary"}
            className={danger ? "border border-neg/40" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
