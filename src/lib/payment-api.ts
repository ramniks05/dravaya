// Client now talks to our Vercel serverless API for security

export type PaymentMode = 'UPI' | 'IMPS' | 'NEFT'
export type TransactionStatus = 'pending' | 'failed' | 'processing' | 'success' | 'reversed'

export interface BeneficiaryData {
  name: string
  phoneNumber: string
  // For UPI
  vpaAddress?: string
  // For IMPS/NEFT
  accountNumber?: string
  ifsc?: string
  bankName?: string
}

export interface FundTransferRequest {
  beneficiary: BeneficiaryData
  amount: number
  mode: PaymentMode
  merchantReferenceId: string
  narration?: string
}

export interface FundTransferResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    merchant_reference_id: string
    amount: number
    currency: string
    status: TransactionStatus
    purpose: string
    mode: PaymentMode
    utr: string | null
    narration: string
  }
  errors?: any
}

export interface TransactionStatusResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    merchant_reference_id: string
    amount: number
    status: TransactionStatus
    mode: PaymentMode
    utr: string | null
  }
  errors?: any
}

export interface BalanceResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    balance: number
  }
  errors?: string[]
}

/**
 * Initiates a fund transfer
 */
export async function initiateFundTransfer(
  request: FundTransferRequest,
  _unusedEncryptionKey: string
): Promise<FundTransferResponse> {
  try {
    const response = await fetch(`/api/payout/fundTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beneficiary: request.beneficiary,
        amount: request.amount,
        mode: request.mode,
        merchantReferenceId: request.merchantReferenceId,
        narration: request.narration,
      }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Fund transfer error:', error)
    throw error
  }
}

/**
 * Checks transaction status
 */
export async function checkTransactionStatus(
  merchantReferenceId: string
): Promise<TransactionStatusResponse> {
  try {
    const response = await fetch(`/api/payout/transactionStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_reference_id: merchantReferenceId,
      }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Transaction status error:', error)
    throw error
  }
}

/**
 * Gets account balance
 */
export async function getAccountBalance(): Promise<BalanceResponse> {
  try {
    const response = await fetch(`/api/account/balance`, { method: 'GET' })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Balance check error:', error)
    throw error
  }
}

/**
 * Generates a unique merchant reference ID
 */
export function generateMerchantReferenceId(vendorId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `VND${vendorId.substring(0, 8)}${timestamp}${random}`
}
