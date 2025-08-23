import * as React from "react"
import { ToastActionElement, type ToastProps } from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const toastQueue: ToasterToast[] = []

export function useToast() {
  // for now just a simple wrapper, you can expand later
  const addToast = React.useCallback((toast: Omit<ToasterToast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    toastQueue.push({ id, ...toast })
    console.log("Toast:", toast.title || toast.description) // placeholder
  }, [])

  return { toast: addToast }
}
