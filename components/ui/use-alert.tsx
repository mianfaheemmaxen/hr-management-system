"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type AlertType = "info" | "error" | "success" | "warning"

interface AlertOptions {
  title?: string
  message: string
  type?: AlertType
  confirmText?: string
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void
  showConfirm: (options: ConfirmOptions) => Promise<boolean>
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = React.useState<{
    open: boolean
    options: AlertOptions | null
  }>({
    open: false,
    options: null,
  })

  const [confirmState, setConfirmState] = React.useState<{
    open: boolean
    options: ConfirmOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    open: false,
    options: null,
    resolve: null,
  })

  const showAlert = React.useCallback((options: AlertOptions) => {
    setAlertState({
      open: true,
      options,
    })
  }, [])

  const showConfirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleAlertClose = () => {
    setAlertState({ open: false, options: null })
  }

  const handleConfirmClose = (confirmed: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(confirmed)
    }
    setConfirmState({ open: false, options: null, resolve: null })
  }

  const getAlertTitle = (type?: AlertType) => {
    switch (type) {
      case "error":
        return "Error"
      case "success":
        return "Success"
      case "warning":
        return "Warning"
      default:
        return "Information"
    }
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Dialog */}
      <AlertDialog open={alertState.open} onOpenChange={handleAlertClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertState.options?.title || getAlertTitle(alertState.options?.type)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertState.options?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAlertClose}>
              {alertState.options?.confirmText || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmState.open} onOpenChange={() => handleConfirmClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState.options?.title || "Confirm Action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.options?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmClose(false)}>
              {confirmState.options?.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmClose(true)}
              className={
                confirmState.options?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                  : ""
              }
            >
              {confirmState.options?.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = React.useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}

