declare module 'midtrans-client' {
  interface MidtransConfig {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  interface TransactionDetails {
    order_id: string
    gross_amount: number
  }

  interface ItemDetail {
    id: string
    price: number
    quantity: number
    name: string
  }

  interface CustomerDetails {
    first_name: string
    last_name?: string
    email: string
    phone?: string
  }

  interface TransactionParam {
    transaction_details: TransactionDetails
    item_details?: ItemDetail[]
    customer_details?: CustomerDetails
    enabled_payments?: string[]
    expiry?: {
      start_time?: string
      unit: 'minute' | 'hour' | 'day'
      duration: number
    }
    callbacks?: {
      finish?: string
    }
  }

  interface SnapCreateTransactionResponse {
    token: string
    redirect_url: string
  }

  class Snap {
    constructor(config: MidtransConfig)
    createTransaction(
      param: TransactionParam
    ): Promise<SnapCreateTransactionResponse>
    createTransactionToken(param: TransactionParam): Promise<string>
    createTransactionRedirectUrl(param: TransactionParam): Promise<string>
  }

  class CoreApi {
    constructor(config: MidtransConfig)
  }
}
