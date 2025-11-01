import { useAuth } from '@/context/AuthContext'
import { generateIV } from '@/lib/encryption'
import { generateMerchantReferenceId, initiateFundTransfer } from '@/lib/payment-api'
import { supabase } from '@/lib/supabase'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    CreditCard,
    Loader,
    Send,
    User
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const paymentSchema = z.object({
  beneficiary_id: z.string().min(1, 'Please select a beneficiary'),
  amount: z.number().min(1, 'Amount must be at least ₹1'),
  narration: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

export default function PaymentForm() {
  const [isProcessing, setIsProcessing] = useState(false)
  const { user, wallet } = useAuth()
  const queryClient = useQueryClient()

  const { data: beneficiaries, isLoading: beneficiariesLoading } = useQuery({
    queryKey: ['beneficiaries', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required')
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as import('@/types/database.types').Database['public']['Tables']['beneficiaries']['Row'][]
    },
    enabled: !!user?.id
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      narration: 'PAYNINJA Fund Transfer'
    }
  })

  const selectedBeneficiaryId = watch('beneficiary_id')
  const selectedBeneficiary = beneficiaries?.find(b => b.id === selectedBeneficiaryId)

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData as any)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await (supabase
        .from('transactions') as any)
        .update(updates)
        .eq('id', id)

      if (error) throw error
    }
  })

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedBeneficiary || !wallet) return

    // Check wallet balance
    if (wallet.balance < data.amount) {
      toast.error('Insufficient wallet balance')
      return
    }

    try {
      setIsProcessing(true)

      // Generate encryption key and merchant reference ID
      const encryptionKey = generateIV()
      const merchantReferenceId = generateMerchantReferenceId(user?.id || '')

      // Create transaction record
      const transactionData = {
        vendor_id: user?.id,
        beneficiary_id: data.beneficiary_id,
        merchant_reference_id: merchantReferenceId,
        amount: data.amount,
        mode: selectedBeneficiary.preferred_mode,
        status: 'pending',
        narration: data.narration,
        encryption_key: encryptionKey,
      }

      const transaction = await createTransactionMutation.mutateAsync(transactionData)
      const transactionTyped = transaction as { id: string } | null | undefined
      if (!transactionTyped?.id) throw new Error('Failed to create transaction')

      // Prepare payment data
      const paymentData = {
        beneficiary: {
          name: selectedBeneficiary.name,
          phoneNumber: selectedBeneficiary.phone_number,
          vpaAddress: selectedBeneficiary.vpa_address ?? undefined,
          accountNumber: selectedBeneficiary.account_number ?? undefined,
          ifsc: selectedBeneficiary.ifsc ?? undefined,
          bankName: selectedBeneficiary.bank_name ?? undefined,
        },
        amount: data.amount,
        mode: selectedBeneficiary.preferred_mode,
        merchantReferenceId,
        narration: data.narration,
      }

      // Initiate payment
      const paymentResponse = await initiateFundTransfer(paymentData, encryptionKey)

      if (paymentResponse.status === 'success') {
        // Update transaction with API response
        await updateTransactionMutation.mutateAsync({
          id: transactionTyped.id,
          updates: {
            status: paymentResponse.data?.status || 'processing',
            utr: paymentResponse.data?.utr,
          }
        })

        // Refresh wallet balance
        await queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] })
        await queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] })

        toast.success('Payment initiated successfully!')
        reset()
      } else {
        // Update transaction as failed
        await updateTransactionMutation.mutateAsync({
          id: transactionTyped.id,
          updates: {
            status: 'failed',
            error_message: paymentResponse.message || 'Payment failed',
          }
        })

        toast.error(paymentResponse.message || 'Payment failed')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (beneficiariesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!beneficiaries || beneficiaries.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No beneficiaries found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please add beneficiaries before making payments.
        </p>
        <div className="mt-6">
          <a
            href="/vendor/beneficiaries"
            className="btn-primary"
          >
            Add Beneficiaries
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Payment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Transfer money to your beneficiaries
        </p>
      </div>

      {/* Wallet Balance */}
      {wallet && (
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Available Balance</h3>
              <p className="text-3xl font-bold">₹{wallet.balance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Beneficiary
            </label>
            <select
              {...register('beneficiary_id')}
              className={`input-field ${errors.beneficiary_id ? 'border-red-300' : ''}`}
            >
              <option value="">Choose a beneficiary</option>
              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.name} - {beneficiary.phone_number} ({beneficiary.preferred_mode})
                </option>
              ))}
            </select>
            {errors.beneficiary_id && (
              <p className="mt-1 text-sm text-red-600">{errors.beneficiary_id.message}</p>
            )}
          </div>

          {selectedBeneficiary && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Beneficiary Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Name:</strong> {selectedBeneficiary.name}</p>
                <p><strong>Phone:</strong> {selectedBeneficiary.phone_number}</p>
                <p><strong>Mode:</strong> {selectedBeneficiary.preferred_mode}</p>
                {selectedBeneficiary.preferred_mode === 'UPI' ? (
                  <p><strong>UPI ID:</strong> {selectedBeneficiary.vpa_address}</p>
                ) : (
                  <>
                    <p><strong>Account:</strong> {selectedBeneficiary.account_number}</p>
                    <p><strong>IFSC:</strong> {selectedBeneficiary.ifsc}</p>
                    <p><strong>Bank:</strong> {selectedBeneficiary.bank_name}</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹)
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min="1"
              step="0.01"
              className={`input-field ${errors.amount ? 'border-red-300' : ''}`}
              placeholder="Enter amount"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
            {wallet && (
              <p className="mt-1 text-xs text-gray-500">
                Available: ₹{wallet.balance.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Narration (Optional)
            </label>
            <input
              {...register('narration')}
              type="text"
              className="input-field"
              placeholder="Enter payment description"
            />
          </div>

          <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-md">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Please verify all details before proceeding. Payments cannot be reversed once initiated.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => reset()}
              className="btn-secondary"
              disabled={isProcessing}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isProcessing || !selectedBeneficiary}
              className="btn-primary disabled:opacity-50 flex items-center gap-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
