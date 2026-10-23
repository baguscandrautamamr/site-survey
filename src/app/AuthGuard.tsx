import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { onSnapshot, doc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from '../features/auth/useAuth'
import { auth, db } from '../firebase/config'
import AppShell from './AppShell'

export default function AuthGuard() {
  const { user, initializing } = useAuth()

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'bannedUsers', user.uid), (snap) => {
      if (snap.exists()) {
        sessionStorage.setItem('banned', '1')
        signOut(auth)
      }
    })
  }, [user])

  if (initializing) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-gray-500">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}
