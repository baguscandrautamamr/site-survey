import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import type { UserProfile } from '../../types/models'

export function useIsAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() as Omit<UserProfile, 'id'> | undefined
      setIsAdmin(data?.role === 'admin')
      setLoading(false)
    })
  }, [user])

  return { isAdmin, loading }
}
