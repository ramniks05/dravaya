import type { Database } from './database.types'

// Helper types for joined query results
type User = Database['public']['Tables']['users']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']
type Beneficiary = Database['public']['Tables']['beneficiaries']['Row']
type WalletRequest = Database['public']['Tables']['wallet_requests']['Row']
type Wallet = Database['public']['Tables']['wallets']['Row']

export type TransactionWithRelations = Transaction & {
  vendor?: User
  beneficiary?: Beneficiary
}

export type WalletRequestWithVendor = WalletRequest & {
  vendor?: User
}

export type UserWithWallet = User & {
  wallet?: Wallet
}

