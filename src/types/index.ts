export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'vendor' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
}

export interface Beneficiary {
  id: string
  vendor_id: string
  name: string
  phone_number: string
  vpa_address: string | null
  account_number: string | null
  ifsc: string | null
  bank_name: string | null
  preferred_mode: 'UPI' | 'IMPS' | 'NEFT'
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  vendor_id: string
  beneficiary_id: string | null
  merchant_reference_id: string
  amount: number
  mode: 'UPI' | 'IMPS' | 'NEFT'
  status: 'pending' | 'failed' | 'processing' | 'success' | 'reversed'
  utr: string | null
  narration: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  beneficiary?: Beneficiary
}

export interface WalletRequest {
  id: string
  vendor_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
  processed_by: string | null
  vendor?: User
}

export interface AuthContextType {
  user: User | null
  wallet: Wallet | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role: 'vendor' | 'admin') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshWallet: () => Promise<void>
}
