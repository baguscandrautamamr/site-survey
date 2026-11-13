import { useMemo } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Pin } from '../../types/models'

// createdAt/updatedAt berupa Firestore Timestamp saat runtime (number di data lama)
function toDate(v: unknown): Date | null {
  if (typeof v === 'number' && v > 0) return new Date(v)
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate()
  return null
}

function formatWhen(v: unknown, lang: string) {
  const d = toDate(v)
  if (!d) return ''
  return d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Baris kecil di form temuan/aset: siapa yang membuat dan siapa yang terakhir mengubah.
export function PinAuthorInfo({ pin }: { pin: Pin }) {
  const { t, lang } = useTranslation()
  const created = formatWhen(pin.createdAt, lang)
  const updated = formatWhen(pin.updatedAt, lang)
  return (
    <div className="mb-3 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      <p className="truncate">
        {t('pinAuthor.createdBy', { name: pin.createdByName || '-' })}
        {created && ` · ${created}`}
      </p>
      {/* Pin yang belum pernah diubah sejak fitur ini ada tidak punya data pengedit */}
      {pin.updatedByName && (
        <p className="truncate">
          {t('pinAuthor.updatedBy', { name: pin.updatedByName })}
          {updated && ` · ${updated}`}
        </p>
      )}
    </div>
  )
}

export const ALL_CREATORS = 'all'

// Daftar pembuat pin yang ada + pin yang lolos filter. Filter yang orangnya sudah
// tidak punya pin lagi dianggap "semua", supaya layar tidak tiba-tiba kosong.
export function useCreatorFilter(pins: Pin[], selected: string) {
  return useMemo(() => {
    const names = new Map<string, string>()
    for (const pin of pins) {
      if (pin.createdBy && !names.has(pin.createdBy)) names.set(pin.createdBy, pin.createdByName || pin.createdBy)
    }
    const creators = [...names.entries()]
      .map(([uid, name]) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
    const active = names.has(selected) ? selected : ALL_CREATORS
    const visiblePins = active === ALL_CREATORS ? pins : pins.filter((p) => p.createdBy === active)
    return { creators, active, visiblePins }
  }, [pins, selected])
}

interface CreatorFilterProps {
  creators: { uid: string; name: string }[]
  value: string
  onChange: (uid: string) => void
  className?: string
}

export function CreatorFilter({ creators, value, onChange, className = '' }: CreatorFilterProps) {
  const { t } = useTranslation()
  // Tidak ada yang perlu dibedakan kalau semua pin dibuat satu orang
  if (creators.length < 2) return null
  return (
    <label className={`flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
      <span className="shrink-0">{t('pinAuthor.filterLabel')}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`max-w-[11rem] rounded-lg border px-2 py-1 text-xs focus:outline-none dark:bg-slate-800 dark:text-white ${
          value === ALL_CREATORS
            ? 'border-slate-300 bg-white text-slate-900 dark:border-slate-600'
            : 'border-blue-500 bg-blue-50 font-semibold text-blue-800 dark:border-blue-400'
        }`}
      >
        <option value={ALL_CREATORS}>{t('pinAuthor.filterAll')}</option>
        {creators.map((c) => (
          <option key={c.uid} value={c.uid}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}
