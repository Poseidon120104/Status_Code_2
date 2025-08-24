"use client";

import * as React from "react";
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

type ToastType = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode; // Pass a React node for action button
  variant?: "default" | "destructive";
};

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastType[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, ...toast }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const Toaster = () => (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, variant }) => (
        <Toast
          key={id}
          open
          variant={variant}
          onOpenChange={(open) => {
            if (!open) removeToast(id);
          }}
        >
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {action && (
            <ToastAction asChild altText="Toast Action">
              {action}
            </ToastAction>
          )}
          <ToastClose asChild>
            <button aria-label="Close" />
          </ToastClose>
        </Toast>
      ))}
      <ToastViewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-96 z-50" />
    </ToastProvider>
  );

  return {
    toast: addToast,
    Toaster,
  };
}
