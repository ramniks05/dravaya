import AdminLayout from '@/components/admin/AdminLayout'
import AdminOverview from '@/components/admin/AdminOverview'
import TransactionMonitoring from '@/components/admin/TransactionMonitoring'
import VendorManagement from '@/components/admin/VendorManagement'
import WalletManagement from '@/components/admin/WalletManagement'
import { Route, Routes } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/vendors" element={<VendorManagement />} />
        <Route path="/wallets" element={<WalletManagement />} />
        <Route path="/transactions" element={<TransactionMonitoring />} />
      </Routes>
    </AdminLayout>
  )
}
