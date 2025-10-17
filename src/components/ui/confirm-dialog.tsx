"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
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

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    console.log("🔍 DEBUG: ConfirmDialog - handleConfirm chamado");
    try {
      onConfirm();
      console.log("🔍 DEBUG: ConfirmDialog - onConfirm executado");
      onOpenChange(false);
      console.log("🔍 DEBUG: ConfirmDialog - fechando diálogo");
    } catch (error) {
      console.error("❌ DEBUG: ConfirmDialog - erro ao confirmar:", error);
    }
  };

  const handleCancel = () => {
    console.log("🔍 DEBUG: ConfirmDialog - handleCancel chamado");
    try {
      onCancel?.();
      console.log("🔍 DEBUG: ConfirmDialog - onCancel executado");
      onOpenChange(false);
      console.log("🔍 DEBUG: ConfirmDialog - fechando diálogo");
    } catch (error) {
      console.error("❌ DEBUG: ConfirmDialog - erro ao cancelar:", error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
