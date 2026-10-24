import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from '../i18n/LanguageContext'

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

// Versi baru dari Vercel diunduh di latar belakang oleh service worker, tapi halaman
// yang sedang terbuka (terutama PWA terpasang di HP) tetap menjalankan versi lama.
// Banner ini meminta pengguna memuat ulang, bukan otomatis, supaya isian form
// yang belum disimpan tidak hilang.
export default function UpdateBanner() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      setInterval(check, UPDATE_CHECK_INTERVAL_MS)
      // PWA di HP jarang benar-benar ditutup; cek setiap kali aplikasi dibuka lagi
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-3 bg-blue-700 px-4 py-3 text-sm text-white shadow-lg">
      <span>{t('app.updateAvailable')}</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-blue-700"
      >
        {t('app.updateNow')}
      </button>
    </div>
  )
}
