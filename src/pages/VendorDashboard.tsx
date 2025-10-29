import Beneficiaries from '@/components/vendor/Beneficiaries'
import Dashboard from '@/components/vendor/Dashboard'
import PaymentForm from '@/components/vendor/PaymentForm'
import Transactions from '@/components/vendor/Transactions'
import VendorLayout from '@/components/vendor/VendorLayout'
import Wallet from '@/components/vendor/Wallet'
import { Route, Routes } from 'react-router-dom'

export default function VendorDashboard() {
  return (
    <VendorLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/beneficiaries" element={<Beneficiaries />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/payment" element={<PaymentForm />} />
      </Routes>
    </VendorLayout>
  )
}
