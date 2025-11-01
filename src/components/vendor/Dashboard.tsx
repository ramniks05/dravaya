import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { TransactionWithRelations } from '@/types/query-types'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    TrendingUp,
    Users,
    XCircle
} from 'lucide-react'

export default function Dashboard() {
  const { user, wallet } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['vendor-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required')
      const [transactionsResult, beneficiariesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('vendor_id', user.id),
        supabase
          .from('beneficiaries')
          .select('*')
          .eq('vendor_id', user.id)
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (beneficiariesResult.error) throw beneficiariesResult.error

      const transactions = (transactionsResult.data || []) as import('@/types/database.types').Database['public']['Tables']['transactions']['Row'][]
      const beneficiaries = (beneficiariesResult.data || []) as import('@/types/database.types').Database['public']['Tables']['beneficiaries']['Row'][]

      const totalTransactions = transactions.length
      const successfulTransactions = transactions.filter(t => t.status === 'success').length
      const pendingTransactions = transactions.filter(t => t.status === 'pending' || t.status === 'processing').length
      const failedTransactions = transactions.filter(t => t.status === 'failed').length
      const totalAmount = transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        totalTransactions,
        successfulTransactions,
        pendingTransactions,
        failedTransactions,
        totalAmount,
        totalBeneficiaries: beneficiaries.length
      }
    },
    enabled: !!user?.id
  })

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions', user?.id],
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
        .limit(5)

      if (error) throw error
      return (data || []) as TransactionWithRelations[]
    },
    enabled: !!user?.id
  })

  const statCards = [
    {
      name: 'Total Transactions',
      value: stats?.totalTransactions || 0,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Successful Payments',
      value: stats?.successfulTransactions || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Pending Payments',
      value: stats?.pendingTransactions || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'Total Beneficiaries',
      value: stats?.totalBeneficiaries || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
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
        return <AlertCircle className="h-4 w-4 text-gray-500" />
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.full_name}! Here's what's happening with your payouts.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Wallet Balance */}
      {wallet && (
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Wallet Balance</h3>
              <p className="text-3xl font-bold">₹{wallet.balance.toLocaleString()}</p>
              <p className="text-primary-100 text-sm">Available for payouts</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-full">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          <a
            href="/vendor/transactions"
            className="text-sm text-primary-600 hover:text-primary-500 font-medium"
          >
            View all
          </a>
        </div>
        
        {transactionsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : recentTransactions && recentTransactions.length > 0 ? (
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
                      {transaction.beneficiary?.name || 'Unknown Beneficiary'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
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
            <p className="mt-1 text-sm text-gray-500">Get started by making your first payment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
