import StatusBadge from '@/components/common/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { TransactionWithRelations } from '@/types/query-types'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    CreditCard,
    Download,
    Eye,
    Filter,
    RefreshCw,
    Search
} from 'lucide-react'
import { useState } from 'react'

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { user } = useAuth()

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required')
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          beneficiary:beneficiaries(*)
        `)
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as TransactionWithRelations[]
    },
    enabled: !!user?.id
  })

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = 
      transaction.merchant_reference_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.beneficiary?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      case 'pending':
      case 'processing':
        return '⏳'
      case 'reversed':
        return '🔄'
      default:
        return '❓'
    }
  }


  const exportTransactions = () => {
    if (!transactions) return

    const csvContent = [
      ['Date', 'Reference ID', 'Beneficiary', 'Amount', 'Mode', 'Status', 'UTR'],
      ...transactions.map(t => [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.merchant_reference_id,
        t.beneficiary?.name || 'N/A',
        t.amount,
        t.mode,
        t.status,
        t.utr || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your payment transactions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportTransactions}
            className="btn-secondary flex items-center gap-x-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <li key={transaction.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.beneficiary?.name || 'Unknown Beneficiary'}
                        </p>
                        <span className="text-lg">{getStatusIcon(transaction.status)}</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Ref: {transaction.merchant_reference_id}</span>
                        <span>•</span>
                        <span>{transaction.mode}</span>
                        {transaction.utr && (
                          <>
                            <span>•</span>
                            <span>UTR: {transaction.utr}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{transaction.amount.toLocaleString()}
                      </p>
                      <StatusBadge status={transaction.status} />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {transaction.error_message && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md">
                    <p className="text-sm text-red-600">{transaction.error_message}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'No transactions match your filters.'
              : 'Get started by making your first payment.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
