"use client";

import { ReactNode } from "react";
import { OverlayPanel } from "./OverlayPanel";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <OverlayPanel
      open={open}
      onClose={onClose}
      title={title ?? "Dialog"}
      className={className}
    >
      {children}
    </OverlayPanel>
  );
}
