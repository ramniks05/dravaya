import Modal from '@/components/common/Modal'
import StatusBadge from '@/components/common/StatusBadge'
import { supabase } from '@/lib/supabase'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    CheckCircle,
    Clock,
    Plus,
    Search,
    User,
    Wallet,
    XCircle
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const topupSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least ₹1'),
  notes: z.string().optional(),
})

type TopupFormData = z.infer<typeof topupSchema>

export default function WalletManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: walletRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['wallet-requests-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_requests')
        .select(`
          *,
          vendor:users!wallet_requests_vendor_id_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors-for-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          wallet:wallets(*)
        `)
        .eq('role', 'vendor')
        .eq('status', 'approved')

      if (error) throw error
      return data || []
    }
  })

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
      const { error } = await supabase
        .from('wallet_requests')
        .update({ 
          status,
          admin_notes: notes,
          processed_at: new Date().toISOString(),
          processed_by: 'admin' // In real app, use actual admin ID
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-requests-admin'] })
      queryClient.invalidateQueries({ queryKey: ['vendors-for-wallet'] })
      toast.success('Request updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update request')
    }
  })

  const manualTopupMutation = useMutation({
    mutationFn: async ({ vendorId, amount, notes }: { vendorId: string, amount: number, notes?: string }) => {
      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: supabase.raw(`balance + ${amount}`)
        })
        .eq('user_id', vendorId)

      if (walletError) throw walletError

      // Create a manual top-up record
      const { error: recordError } = await supabase
        .from('wallet_requests')
        .insert({
          vendor_id: vendorId,
          amount,
          status: 'approved',
          admin_notes: notes || 'Manual top-up by admin',
          processed_at: new Date().toISOString(),
          processed_by: 'admin'
        })

      if (recordError) throw recordError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-requests-admin'] })
      queryClient.invalidateQueries({ queryKey: ['vendors-for-wallet'] })
      toast.success('Manual top-up completed!')
      setIsTopupModalOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process top-up')
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TopupFormData>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 0,
      notes: ''
    }
  })

  const filteredRequests = walletRequests?.filter(request => {
    const matchesSearch = 
      request.vendor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.vendor?.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  const handleApprove = (request: any) => {
    if (window.confirm(`Approve top-up request of ₹${request.amount} for ${request.vendor?.full_name}?`)) {
      updateRequestMutation.mutate({ 
        id: request.id, 
        status: 'approved' 
      })
    }
  }

  const handleReject = (request: any) => {
    if (window.confirm(`Reject top-up request of ₹${request.amount} for ${request.vendor?.full_name}?`)) {
      updateRequestMutation.mutate({ 
        id: request.id, 
        status: 'rejected' 
      })
    }
  }

  const onSubmit = (data: TopupFormData) => {
    if (selectedVendor) {
      manualTopupMutation.mutate({
        vendorId: selectedVendor.id,
        amount: data.amount,
        notes: data.notes
      })
    }
  }

  const handleManualTopup = (vendor: any) => {
    setSelectedVendor(vendor)
    setIsTopupModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage wallet top-up requests and vendor balances
          </p>
        </div>
        <button
          onClick={() => setIsTopupModalOpen(true)}
          className="btn-primary flex items-center gap-x-2"
        >
          <Plus className="h-4 w-4" />
          Manual Top-up
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Wallet Requests */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top-up Requests</h3>
        {requestsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary-100 rounded-full">
                    <Wallet className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.vendor?.full_name || 'Unknown Vendor'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.vendor?.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{request.amount.toLocaleString()}
                    </p>
                    <StatusBadge status={request.status} />
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(request)}
                        className="btn-success flex items-center gap-x-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="btn-danger flex items-center gap-x-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
            <p className="mt-1 text-sm text-gray-500">No wallet top-up requests found.</p>
          </div>
        )}
      </div>

      {/* Vendor Wallets */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Wallets</h3>
        {vendorsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : vendors && vendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {vendor.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vendor.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{vendor.wallet?.balance?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-gray-500">Current Balance</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => handleManualTopup(vendor)}
                    className="btn-primary text-xs"
                  >
                    Add Funds
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors</h3>
            <p className="mt-1 text-sm text-gray-500">No approved vendors found.</p>
          </div>
        )}
      </div>

      {/* Manual Top-up Modal */}
      <Modal
        isOpen={isTopupModalOpen}
        onClose={() => {
          setIsTopupModalOpen(false)
          setSelectedVendor(null)
          reset()
        }}
        title="Manual Top-up"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {selectedVendor && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                Vendor: {selectedVendor.full_name}
              </p>
              <p className="text-xs text-gray-500">
                Current Balance: ₹{selectedVendor.wallet?.balance?.toLocaleString() || 0}
              </p>
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
              placeholder="Enter amount to add"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input-field"
              placeholder="Add notes for this top-up"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsTopupModalOpen(false)
                setSelectedVendor(null)
                reset()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={manualTopupMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {manualTopupMutation.isPending ? 'Processing...' : 'Add Funds'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
