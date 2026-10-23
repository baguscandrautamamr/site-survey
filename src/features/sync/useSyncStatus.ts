import { useEffect, useState } from 'react'
import { subscribePendingCount } from './syncManager'

export function useSyncStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const unsub = subscribePendingCount(setPendingCount)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsub()
    }
  }, [])

  return { online, pendingCount }
}
