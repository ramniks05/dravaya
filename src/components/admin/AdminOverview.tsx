import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    CreditCard,
    TrendingUp,
    Users,
    Wallet,
    XCircle
} from 'lucide-react'

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        usersResult,
        transactionsResult,
        walletRequestsResult,
        walletsResult
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('wallet_requests').select('*'),
        supabase.from('wallets').select('*')
      ])

      if (usersResult.error) throw usersResult.error
      if (transactionsResult.error) throw transactionsResult.error
      if (walletRequestsResult.error) throw walletRequestsResult.error
      if (walletsResult.error) throw walletsResult.error

      const users = usersResult.data || []
      const transactions = transactionsResult.data || []
      const walletRequests = walletRequestsResult.data || []
      const wallets = walletsResult.data || []

      const totalVendors = users.filter(u => u.role === 'vendor').length
      const pendingVendors = users.filter(u => u.role === 'vendor' && u.status === 'pending').length
      const approvedVendors = users.filter(u => u.role === 'vendor' && u.status === 'approved').length
      const totalTransactions = transactions.length
      const successfulTransactions = transactions.filter(t => t.status === 'success').length
      const pendingTransactions = transactions.filter(t => t.status === 'pending' || t.status === 'processing').length
      const failedTransactions = transactions.filter(t => t.status === 'failed').length
      const totalVolume = transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0)
      const pendingRequests = walletRequests.filter(r => r.status === 'pending').length
      const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

      return {
        totalVendors,
        pendingVendors,
        approvedVendors,
        totalTransactions,
        successfulTransactions,
        pendingTransactions,
        failedTransactions,
        totalVolume,
        pendingRequests,
        totalWalletBalance
      }
    }
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendor:users!transactions_vendor_id_fkey(*),
          beneficiary:beneficiaries(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    }
  })

  const { data: recentRequests } = useQuery({
    queryKey: ['recent-wallet-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_requests')
        .select(`
          *,
          vendor:users!wallet_requests_vendor_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data || []
    }
  })

  const statCards = [
    {
      name: 'Total Vendors',
      value: stats?.totalVendors || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `${stats?.approvedVendors || 0} approved`
    },
    {
      name: 'Pending Approvals',
      value: stats?.pendingVendors || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: 'Awaiting review'
    },
    {
      name: 'Total Transactions',
      value: stats?.totalTransactions || 0,
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `${stats?.successfulTransactions || 0} successful`
    },
    {
      name: 'Transaction Volume',
      value: `₹${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: 'Total processed'
    },
    {
      name: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: Wallet,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: 'Wallet top-ups'
    },
    {
      name: 'Total Wallet Balance',
      value: `₹${(stats?.totalWalletBalance || 0).toLocaleString()}`,
      icon: Wallet,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: 'Across all vendors'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
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
      default:
        return 'text-gray-600'
    }
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of the payout management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
            <a
              href="/admin/transactions"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View all
            </a>
          </div>
          
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
                        {transaction.vendor?.full_name || 'Unknown Vendor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.beneficiary?.name || 'Unknown Beneficiary'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{transaction.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500">Transaction history will appear here.</p>
            </div>
          )}
        </div>

        {/* Recent Wallet Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Wallet Requests</h3>
            <a
              href="/admin/wallets"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View all
            </a>
          </div>
          
          {recentRequests && recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.vendor?.full_name || 'Unknown Vendor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{request.amount.toLocaleString()}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
              <p className="mt-1 text-sm text-gray-500">Wallet requests will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
