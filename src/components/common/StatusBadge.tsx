import { cn } from '@/utils/cn'

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'success' | 'failed' | 'reversed'
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800'
    },
    approved: {
      label: 'Approved',
      className: 'bg-success-100 text-success-800'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-danger-100 text-danger-800'
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-800'
    },
    success: {
      label: 'Success',
      className: 'bg-success-100 text-success-800'
    },
    failed: {
      label: 'Failed',
      className: 'bg-danger-100 text-danger-800'
    },
    reversed: {
      label: 'Reversed',
      className: 'bg-gray-100 text-gray-800'
    }
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
