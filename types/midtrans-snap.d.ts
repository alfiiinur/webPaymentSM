// Type declarations for Midtrans Snap.js loaded via CDN script tag
// https://docs.midtrans.com/reference/snap-js

interface SnapCallbackResult {
  order_id: string
  payment_type?: string
  transaction_status?: string
  fraud_status?: string
  transaction_id?: string
  gross_amount?: string
}

interface SnapOptions {
  onSuccess?: (result: SnapCallbackResult) => void
  onPending?: (result: SnapCallbackResult) => void
  onError?: (result: SnapCallbackResult) => void
  onClose?: () => void
  language?: 'en' | 'id'
  autoCloseDelay?: number
  displayLoader?: boolean
  skipOrderSummary?: boolean
}

interface SnapInstance {
  pay: (snapToken: string, options?: SnapOptions) => void
  hide: () => void
}

declare global {
  interface Window {
    snap: SnapInstance
  }
}

export {}
