"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, Check, Info, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return mounted;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mounted = useMounted();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, message, type, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`
                  pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-md animate-in slide-in-from-right-full fade-in duration-300
                  ${toast.type === "success"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : toast.type === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : toast.type === "warning"
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }
                `}
              >
                {toast.type === "success" && <Check className="w-5 h-5 shrink-0" />}
                {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
                {toast.type === "warning" && <AlertCircle className="w-5 h-5 shrink-0" />}
                {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}

                <p className="text-sm font-medium flex-1">{toast.message}</p>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
