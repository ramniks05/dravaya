import Modal from '@/components/common/Modal'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Plus,
    TrendingUp,
    Wallet,
    XCircle
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const requestSchema = z.object({
  amount: z.number().min(100, 'Minimum request amount is ₹100'),
  reason: z.string().min(10, 'Please provide a reason for the request'),
})

type RequestFormData = z.infer<typeof requestSchema>

export default function WalletPage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const { user, wallet } = useAuth()
  const queryClient = useQueryClient()

  const { data: walletRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['wallet-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required')
      const { data, error } = await supabase
        .from('wallet_requests')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as import('@/types/database.types').Database['public']['Tables']['wallet_requests']['Row'][]
    },
    enabled: !!user?.id
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required')
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return (data || []) as import('@/types/database.types').Database['public']['Tables']['transactions']['Row'][]
    },
    enabled: !!user?.id
  })

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      if (!user?.id) throw new Error('User ID is required')
      const { error } = await supabase
        .from('wallet_requests')
        .insert({
          vendor_id: user.id,
          amount: data.amount,
          admin_notes: data.reason,
        } as any)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-requests'] })
      toast.success('Wallet top-up request submitted successfully!')
      setIsRequestModalOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit request')
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      amount: 0,
      reason: ''
    }
  })

  const onSubmit = (data: RequestFormData) => {
    createRequestMutation.mutate(data)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your wallet balance and top-up requests
          </p>
        </div>
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="btn-primary flex items-center gap-x-2"
        >
          <Plus className="h-4 w-4" />
          Request Top-up
        </button>
      </div>

      {/* Wallet Balance Card */}
      {wallet && (
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Current Balance</h3>
              <p className="text-4xl font-bold">₹{wallet.balance.toLocaleString()}</p>
              <p className="text-primary-100 text-sm">Available for payouts</p>
            </div>
            <div className="p-4 bg-white bg-opacity-20 rounded-full">
              <Wallet className="h-12 w-12" />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Deposits</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{walletRequests?.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-md">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-2xl font-semibold text-gray-900">
                {walletRequests?.filter(r => r.status === 'pending').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">
                {walletRequests?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(transaction.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Payment to {transaction.beneficiary_id ? 'Beneficiary' : 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    -₹{transaction.amount.toLocaleString()}
                  </p>
                  <StatusBadge status={transaction.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">Your transaction history will appear here.</p>
          </div>
        )}
      </div>

      {/* Wallet Requests */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top-up Requests</h3>
        {requestsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : walletRequests && walletRequests.length > 0 ? (
          <div className="space-y-4">
            {walletRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(request.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Request for ₹{request.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.admin_notes && (
                      <p className="text-xs text-gray-600 mt-1">
                        Reason: {request.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={request.status} />
                  {request.processed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Processed: {format(new Date(request.processed_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Plus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
            <p className="mt-1 text-sm text-gray-500">Your top-up requests will appear here.</p>
          </div>
        )}
      </div>

      {/* Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Wallet Top-up"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹)
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min="100"
              step="100"
              className={`input-field ${errors.amount ? 'border-red-300' : ''}`}
              placeholder="Enter amount (minimum ₹100)"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Request
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              className={`input-field ${errors.reason ? 'border-red-300' : ''}`}
              placeholder="Please provide a reason for this top-up request"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              Your request will be reviewed by an admin before approval.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRequestMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
