"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SimpleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "destructive";
}

export function SimpleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  variant = "default",
}: SimpleConfirmDialogProps) {
  const handleConfirm = () => {
    console.log("🔍 DEBUG: SimpleConfirmDialog - handleConfirm chamado");
    try {
      onConfirm();
      console.log("🔍 DEBUG: SimpleConfirmDialog - onConfirm executado");
      onOpenChange(false);
      console.log("🔍 DEBUG: SimpleConfirmDialog - fechando diálogo");
    } catch (error) {
      console.error(
        "❌ DEBUG: SimpleConfirmDialog - erro ao confirmar:",
        error
      );
    }
  };

  const handleCancel = () => {
    console.log("🔍 DEBUG: SimpleConfirmDialog - handleCancel chamado");
    try {
      onCancel?.();
      console.log("🔍 DEBUG: SimpleConfirmDialog - onCancel executado");
      onOpenChange(false);
      console.log("🔍 DEBUG: SimpleConfirmDialog - fechando diálogo");
    } catch (error) {
      console.error("❌ DEBUG: SimpleConfirmDialog - erro ao cancelar:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
