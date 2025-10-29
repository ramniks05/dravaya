export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'vendor' | 'admin'
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: 'vendor' | 'admin'
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'vendor' | 'admin'
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      wallet_requests: {
        Row: {
          id: string
          vendor_id: string
          amount: number
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          created_at: string
          updated_at: string
          processed_at: string | null
          processed_by: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          amount: number
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          processed_at?: string | null
          processed_by?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          amount?: number
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          processed_at?: string | null
          processed_by?: string | null
        }
      }
      beneficiaries: {
        Row: {
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
        Insert: {
          id?: string
          vendor_id: string
          name: string
          phone_number: string
          vpa_address?: string | null
          account_number?: string | null
          ifsc?: string | null
          bank_name?: string | null
          preferred_mode: 'UPI' | 'IMPS' | 'NEFT'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          phone_number?: string
          vpa_address?: string | null
          account_number?: string | null
          ifsc?: string | null
          bank_name?: string | null
          preferred_mode?: 'UPI' | 'IMPS' | 'NEFT'
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          vendor_id: string
          beneficiary_id: string | null
          merchant_reference_id: string
          amount: number
          mode: 'UPI' | 'IMPS' | 'NEFT'
          status: 'pending' | 'failed' | 'processing' | 'success' | 'reversed'
          utr: string | null
          narration: string | null
          encryption_key: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          beneficiary_id?: string | null
          merchant_reference_id: string
          amount: number
          mode: 'UPI' | 'IMPS' | 'NEFT'
          status?: 'pending' | 'failed' | 'processing' | 'success' | 'reversed'
          utr?: string | null
          narration?: string | null
          encryption_key: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          beneficiary_id?: string | null
          merchant_reference_id?: string
          amount?: number
          mode?: 'UPI' | 'IMPS' | 'NEFT'
          status?: 'pending' | 'failed' | 'processing' | 'success' | 'reversed'
          utr?: string | null
          narration?: string | null
          encryption_key?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'vendor' | 'admin'
      user_status: 'pending' | 'approved' | 'rejected'
      transaction_status: 'pending' | 'failed' | 'processing' | 'success' | 'reversed'
      payment_mode: 'UPI' | 'IMPS' | 'NEFT'
      wallet_request_status: 'pending' | 'approved' | 'rejected'
    }
  }
}
