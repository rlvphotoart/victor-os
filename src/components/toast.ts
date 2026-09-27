import { createContext, useContext } from "react";

export type ToastKind = "success" | "error";
export const ToastContext = createContext<
  (message: string, kind?: ToastKind) => void
>(() => {});
export const useToast = () => useContext(ToastContext);
