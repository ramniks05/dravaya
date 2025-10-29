import Modal from '@/components/common/Modal'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Building,
    CreditCard,
    Edit,
    Phone,
    Plus,
    Search,
    Trash2,
    User
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const beneficiarySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  preferred_mode: z.enum(['UPI', 'IMPS', 'NEFT']),
  vpa_address: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z.string().optional(),
  bank_name: z.string().optional(),
}).refine((data) => {
  if (data.preferred_mode === 'UPI') {
    return data.vpa_address && data.vpa_address.length > 0
  } else {
    return data.account_number && data.ifsc && data.bank_name
  }
}, {
  message: "Please fill in all required fields for the selected payment mode",
  path: ["vpa_address"]
})

type BeneficiaryFormData = z.infer<typeof beneficiarySchema>

export default function Beneficiaries() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: beneficiaries, isLoading } = useQuery({
    queryKey: ['beneficiaries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('vendor_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id
  })

  const createMutation = useMutation({
    mutationFn: async (data: BeneficiaryFormData) => {
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          ...data,
          vendor_id: user?.id
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      toast.success('Beneficiary added successfully!')
      setIsModalOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add beneficiary')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: BeneficiaryFormData }) => {
      const { error } = await supabase
        .from('beneficiaries')
        .update(data)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      toast.success('Beneficiary updated successfully!')
      setIsModalOpen(false)
      setEditingBeneficiary(null)
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update beneficiary')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      toast.success('Beneficiary deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete beneficiary')
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(beneficiarySchema),
    defaultValues: {
      preferred_mode: 'UPI'
    }
  })

  const selectedMode = watch('preferred_mode')

  const filteredBeneficiaries = beneficiaries?.filter(beneficiary =>
    beneficiary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beneficiary.phone_number.includes(searchTerm)
  ) || []

  const onSubmit = (data: BeneficiaryFormData) => {
    if (editingBeneficiary) {
      updateMutation.mutate({ id: editingBeneficiary.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (beneficiary: any) => {
    setEditingBeneficiary(beneficiary)
    reset(beneficiary)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this beneficiary?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBeneficiary(null)
    reset()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your payment beneficiaries
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-x-2"
        >
          <Plus className="h-4 w-4" />
          Add Beneficiary
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search beneficiaries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Beneficiaries List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredBeneficiaries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBeneficiaries.map((beneficiary) => (
            <div key={beneficiary.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-full">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {beneficiary.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-x-1">
                      <Phone className="h-3 w-3" />
                      {beneficiary.phone_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(beneficiary)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(beneficiary.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Payment Mode</span>
                  <StatusBadge status={beneficiary.preferred_mode.toLowerCase() as any} />
                </div>
                
                {beneficiary.preferred_mode === 'UPI' ? (
                  <div className="flex items-center gap-x-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600">{beneficiary.vpa_address}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-600">{beneficiary.bank_name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {beneficiary.account_number} • {beneficiary.ifsc}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No beneficiaries</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first beneficiary.
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBeneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              {...register('name')}
              type="text"
              className={`input-field ${errors.name ? 'border-red-300' : ''}`}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('phone_number')}
              type="tel"
              className={`input-field ${errors.phone_number ? 'border-red-300' : ''}`}
              placeholder="Enter phone number"
            />
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Mode
            </label>
            <select
              {...register('preferred_mode')}
              className={`input-field ${errors.preferred_mode ? 'border-red-300' : ''}`}
            >
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
            </select>
            {errors.preferred_mode && (
              <p className="mt-1 text-sm text-red-600">{errors.preferred_mode.message}</p>
            )}
          </div>

          {selectedMode === 'UPI' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UPI ID
              </label>
              <input
                {...register('vpa_address')}
                type="text"
                className={`input-field ${errors.vpa_address ? 'border-red-300' : ''}`}
                placeholder="Enter UPI ID (e.g., user@paytm)"
              />
              {errors.vpa_address && (
                <p className="mt-1 text-sm text-red-600">{errors.vpa_address.message}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  {...register('account_number')}
                  type="text"
                  className={`input-field ${errors.account_number ? 'border-red-300' : ''}`}
                  placeholder="Enter account number"
                />
                {errors.account_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.account_number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  {...register('ifsc')}
                  type="text"
                  className={`input-field ${errors.ifsc ? 'border-red-300' : ''}`}
                  placeholder="Enter IFSC code"
                />
                {errors.ifsc && (
                  <p className="mt-1 text-sm text-red-600">{errors.ifsc.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  {...register('bank_name')}
                  type="text"
                  className={`input-field ${errors.bank_name ? 'border-red-300' : ''}`}
                  placeholder="Enter bank name"
                />
                {errors.bank_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.bank_name.message}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {editingBeneficiary ? 'Update' : 'Add'} Beneficiary
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
