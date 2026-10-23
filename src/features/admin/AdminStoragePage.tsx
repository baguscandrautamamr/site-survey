import { useEffect, useState } from 'react'
import { useAllUsers, useAllProjects, useAllPhotos } from './useAdminData'
import { useTranslation } from '../../i18n/LanguageContext'
import { auth } from '../../firebase/config'

interface CloudinaryUsage {
  plan: string
  last_updated: string
  storage: { usage: number; limit: number; used_percent: number }
  bandwidth: { usage: number; limit: number; used_percent: number }
  transformations: { usage: number; limit: number; used_percent: number }
  resources: number
  requests: number
}

const FREE_STORAGE_BYTES = 25 * 1024 * 1024 * 1024
const FREE_BANDWIDTH_BYTES = 25 * 1024 * 1024 * 1024
const FREE_TRANSFORMS = 25000

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function barColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function UsageBar({
  label, used, limit, isCount = false,
}: {
  label: string; used: number; limit: number; isCount?: boolean
}) {
  const { t } = useTranslation()
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const usedStr = isCount ? used.toLocaleString() : formatBytes(used)
  const limitStr = isCount ? limit.toLocaleString() : formatBytes(limit)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{usedStr} / {limitStr}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${Math.max(pct, 0.3)}%` }}
        />
      </div>
      <p className="text-right text-xs text-slate-400">{pct.toFixed(2)}% {t('adminStorage.used')} <span className="text-slate-300">(free plan: est. limit)</span></p>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  )
}

export default function AdminStoragePage() {
  const { t } = useTranslation()
  const { users } = useAllUsers()
  const { projects } = useAllProjects()
  const { pins } = useAllPhotos()

  const [usage, setUsage] = useState<CloudinaryUsage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setUsage(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    Promise.resolve(auth.currentUser?.getIdToken())
      .then((idToken) =>
        fetch('/api/cloudinary-usage', {
          signal: controller.signal,
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }),
      )
      .then(async (res) => {
        const text = await res.text()
        let data: Record<string, unknown>
        try {
          data = JSON.parse(text) as Record<string, unknown>
        } catch {
          throw new Error(`Server error (non-JSON): ${text.slice(0, 150)}`)
        }
        if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
        setUsage(data as unknown as CloudinaryUsage)
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') {
          setError('Request timeout (30 detik). Cek apakah CLOUDINARY_API_KEY dan CLOUDINARY_API_SECRET sudah ditambahkan di Vercel.')
        } else {
          setError(e.message)
        }
      })
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [retryCount])

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-slate-900">{t('adminStorage.title')}</h1>

      {/* App Stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('adminStorage.appStats')}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label={t('adminStorage.statUsers')} value={users.length} color="bg-slate-700" />
          <StatBox label={t('adminStorage.statProjects')} value={projects.length} color="bg-blue-600" />
          <StatBox label={t('adminStorage.statPhotos')} value={pins.length} color="bg-purple-600" />
        </div>
      </section>

      {/* Cloudinary Usage */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Cloudinary
        </h2>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {t('app.loading')} (maks 15 detik...)
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-1 font-semibold">{t('adminStorage.errorTitle')}</p>
            <p className="mb-3 font-mono text-xs">{error}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mb-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Coba Lagi
            </button>
            <p className="font-medium text-slate-700">{t('adminStorage.errorSetup')}</p>
            <ol className="ml-4 mt-1 list-decimal space-y-1 text-slate-600">
              <li>Vercel Dashboard → bagus-candra/site-survey → Settings → Environment Variables</li>
              <li><code className="rounded bg-slate-100 px-1">CLOUDINARY_CLOUD_NAME</code> = <code className="rounded bg-slate-100 px-1">ujlp7doj</code></li>
              <li><code className="rounded bg-slate-100 px-1">CLOUDINARY_API_KEY</code> = dari Cloudinary Console → API Keys</li>
              <li><code className="rounded bg-slate-100 px-1">CLOUDINARY_API_SECRET</code> = dari Cloudinary Console → API Keys</li>
              <li>{t('adminStorage.errorRedeploy')}</li>
            </ol>
          </div>
        )}

        {usage && (
          <div className="space-y-5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {t('adminStorage.plan')}: {usage.plan}
              </span>
              <span className="text-xs text-slate-400">
                {t('adminStorage.lastUpdated')}: {new Date(usage.last_updated).toLocaleString()}
              </span>
            </div>

            <UsageBar
              label={t('adminStorage.storage')}
              used={usage.storage.usage}
              limit={usage.storage.limit || FREE_STORAGE_BYTES}
            />
            <UsageBar
              label={t('adminStorage.bandwidth')}
              used={usage.bandwidth.usage}
              limit={usage.bandwidth.limit || FREE_BANDWIDTH_BYTES}
            />
            <UsageBar
              label={t('adminStorage.transformations')}
              used={usage.transformations.usage}
              limit={usage.transformations.limit || FREE_TRANSFORMS}
              isCount
            />

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{usage.resources}</p>
                <p className="text-xs text-slate-500">{t('adminStorage.filesStored')}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{usage.requests.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{t('adminStorage.requestsMonth')}</p>
              </div>
            </div>

            {(usage.storage.used_percent >= 70 || usage.bandwidth.used_percent >= 70) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ {t('adminStorage.warningHigh')}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
