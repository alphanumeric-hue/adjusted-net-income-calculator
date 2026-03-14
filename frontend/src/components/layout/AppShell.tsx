import { useState } from 'react'
import { Outlet, useParams, useLocation, Navigate } from 'react-router-dom'
import { TopNav } from './TopNav'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/context/AuthContext'

// AppShell renders the main application layout with top navigation and sidebar.
// The sidebar shows the user's tax years; the Outlet renders the active route's page.
// If the authenticated user has force_password_reset set, they are redirected to /reset-password.
export function AppShell() {
  const { year } = useParams()
  const location = useLocation()
  const { forcePasswordReset } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (forcePasswordReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <Sidebar selectedYear={year} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
