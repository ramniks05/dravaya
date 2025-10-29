import StatusBadge from '@/components/common/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    CreditCard,
    Download,
    Eye,
    Filter,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp
} from 'lucide-react'
import { useState } from 'react'

export default function TransactionMonitoring() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendor:users!transactions_vendor_id_fkey(*),
          beneficiary:beneficiaries(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = 
      transaction.merchant_reference_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vendor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.beneficiary?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    
    const matchesDate = (() => {
      if (dateFilter === 'all') return true
      const transactionDate = new Date(transaction.created_at)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          return transactionDate.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return transactionDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return transactionDate >= monthAgo
        default:
          return true
      }
    })()
    
    return matchesSearch && matchesStatus && matchesDate
  }) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'failed':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'pending':
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'pending':
      case 'processing':
        return 'text-yellow-600'
      case 'reversed':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const exportTransactions = () => {
    if (!transactions) return

    const csvContent = [
      ['Date', 'Reference ID', 'Vendor', 'Beneficiary', 'Amount', 'Mode', 'Status', 'UTR'],
      ...transactions.map(t => [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.merchant_reference_id,
        t.vendor?.full_name || 'N/A',
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
    a.download = `admin-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTotalStats = () => {
    const total = filteredTransactions.length
    const successful = filteredTransactions.filter(t => t.status === 'success').length
    const failed = filteredTransactions.filter(t => t.status === 'failed').length
    const pending = filteredTransactions.filter(t => t.status === 'pending' || t.status === 'processing').length
    const totalAmount = filteredTransactions
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0)

    return { total, successful, failed, pending, totalAmount }
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage all payment transactions
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Successful</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.successful}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Volume</p>
              <p className="text-2xl font-semibold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
            </div>
          </div>
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
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input-field"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
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
                        {getStatusIcon(transaction.status)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.vendor?.full_name || 'Unknown Vendor'}
                        </p>
                        <span className="text-gray-400">→</span>
                        <p className="text-sm text-gray-600 truncate">
                          {transaction.beneficiary?.name || 'Unknown Beneficiary'}
                        </p>
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
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'No transactions match your filters.'
              : 'No transactions have been processed yet.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
