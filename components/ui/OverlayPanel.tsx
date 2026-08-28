"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { cx } from "@/lib/utils";
import { XIcon } from "../icons";

interface OverlayPanelProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function OverlayPanel({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: OverlayPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="overlay-panel overlay-panel__backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx("overlay-panel__surface", "atelier-surface", className)}
        role="dialog"
      >
        <header className="overlay-panel__header">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-xs leading-5 text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="overlay-panel__close"
            aria-label={`Close ${title}`}
            title={`Close ${title}`}
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="overlay-panel__body no-scrollbar">{children}</div>
      </section>
    </div>
  );
}
