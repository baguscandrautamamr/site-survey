import { Navigate, Outlet } from 'react-router-dom'
import { useIsAdmin } from './useIsAdmin'

export default function AdminGuard() {
  const { isAdmin, loading } = useIsAdmin()

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Memuat...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
