import Modal from '@/components/common/Modal'
import StatusBadge from '@/components/common/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    CheckCircle,
    Eye,
    Mail,
    Search,
    Users,
    XCircle
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function VendorManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as import('@/types/database.types').Database['public']['Tables']['users']['Row'][]
    }
  })

  const updateVendorStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await (supabase
        .from('users') as any)
        .update({ 
          status: status as 'pending' | 'approved' | 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor status updated successfully!')
      setIsModalOpen(false)
      setSelectedVendor(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendor status')
    }
  })

  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = 
      vendor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  const handleApprove = (vendor: any) => {
    setSelectedVendor(vendor)
    setIsModalOpen(true)
  }

  const handleReject = (vendor: any) => {
    if (window.confirm(`Are you sure you want to reject ${vendor.full_name}?`)) {
      updateVendorStatusMutation.mutate({ 
        id: vendor.id, 
        status: 'rejected' 
      })
    }
  }

  const handleStatusUpdate = (status: string) => {
    if (selectedVendor) {
      updateVendorStatusMutation.mutate({ 
        id: selectedVendor.id, 
        status
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage vendor registrations and approvals
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search vendors..."
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

      {/* Vendors List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredVendors.map((vendor) => (
              <li key={vendor.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {vendor.full_name || 'No name provided'}
                        </p>
                        <StatusBadge status={vendor.status} />
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center gap-x-1">
                          <Mail className="h-4 w-4" />
                          {vendor.email}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Registered: {format(new Date(vendor.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {vendor.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(vendor)}
                          className="btn-success flex items-center gap-x-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(vendor)}
                          className="btn-danger flex items-center gap-x-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedVendor(vendor)
                        setIsModalOpen(true)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'No vendors match your filters.'
              : 'No vendors have registered yet.'
            }
          </p>
        </div>
      )}

      {/* Vendor Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedVendor(null)
        }}
        title="Vendor Details"
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <p className="text-sm text-gray-900">{selectedVendor.full_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900">{selectedVendor.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <StatusBadge status={selectedVendor.status} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Date
                </label>
                <p className="text-sm text-gray-900">
                  {format(new Date(selectedVendor.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>

            {selectedVendor.status === 'pending' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updateVendorStatusMutation.isPending}
                    className="btn-success disabled:opacity-50"
                  >
                    Approve Vendor
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updateVendorStatusMutation.isPending}
                    className="btn-danger disabled:opacity-50"
                  >
                    Reject Vendor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
