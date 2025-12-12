import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateQuotation from './pages/CreateQuotation'
import ViewQuotations from './pages/ViewQuotations'
import StaffManagement from './pages/StaffManagement'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-quotation" element={<CreateQuotation />} />
      <Route path="/quotations" element={<ViewQuotations />} />
      <Route path="/staff" element={<StaffManagement />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
