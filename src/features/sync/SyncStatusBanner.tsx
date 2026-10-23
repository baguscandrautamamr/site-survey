import { useSyncStatus } from './useSyncStatus'
import { useTranslation } from '../../i18n/LanguageContext'

export default function SyncStatusBanner() {
  const { online, pendingCount } = useSyncStatus()
  const { t } = useTranslation()

  if (online && pendingCount === 0) return null

  return (
    <div
      className={`px-4 py-1.5 text-center text-xs font-medium text-white ${
        online ? 'bg-amber-500' : 'bg-slate-600'
      }`}
    >
      {!online && t('sync.offline')}
      {online && pendingCount > 0 && t('sync.syncingPhotos', { count: pendingCount })}
    </div>
  )
}
