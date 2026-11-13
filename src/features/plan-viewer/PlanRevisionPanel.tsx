import { useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import { getPdfPageCount, isPdfFile } from '../../lib/pdfToImage'
import type { Plan } from '../../types/models'

interface Props {
  plan: Plan
  uploading: boolean
  onUpload: (file: File, page: number) => Promise<void>
  // Revisi lama yang sedang ditumpuk di atas gambar sekarang (null = tidak membandingkan)
  compareRevision: number | null
  onCompareChange: (revision: number | null) => void
  opacity: number
  onOpacityChange: (value: number) => void
}

// Baris "Revisi": unggah gambar revisi baru untuk denah ini, dan bandingkan
// gambar sekarang dengan revisi lama lewat penggeser transparansi.
export default function PlanRevisionPanel({
  plan,
  uploading,
  onUpload,
  compareRevision,
  onCompareChange,
  opacity,
  onOpacityChange,
}: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const revisions = [...(plan.revisions ?? [])].sort((a, b) => b.revision - a.revision)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      let page = 1
      if (isPdfFile(file)) {
        const pages = await getPdfPageCount(file)
        if (pages > 1) {
          const answer = window.prompt(t('revision.pickPage', { pages }), '1')
          if (answer === null) return
          page = Math.floor(Number(answer))
          if (!Number.isFinite(page) || page < 1 || page > pages) {
            setError(t('revision.badPage', { pages }))
            return
          }
        }
      }
      if (!window.confirm(t('revision.confirm', { name: plan.name, revision: (plan.revision ?? 1) + 1 }))) return
      await onUpload(file, page)
    } catch (err) {
      setError(t('revision.failed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
      >
        {uploading ? t('plans.uploading') : t('revision.upload')}
      </button>

      {revisions.length === 0 ? (
        <span className="text-slate-500 dark:text-slate-400">{t('revision.none')}</span>
      ) : (
        <>
          <label className="flex items-center gap-1.5">
            {t('revision.compareWith')}
            <select
              value={compareRevision ?? ''}
              onChange={(e) => onCompareChange(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">{t('revision.compareOff')}</option>
              {revisions.map((r) => (
                <option key={r.revision} value={r.revision}>
                  {t('revision.label', { revision: r.revision })}
                  {r.replacedAt ? ` (${new Date(r.replacedAt).toLocaleDateString()})` : ''}
                </option>
              ))}
            </select>
          </label>
          {compareRevision !== null && (
            <label className="flex min-w-[12rem] flex-1 items-center gap-2">
              <span className="shrink-0">{t('revision.current')}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                aria-label={t('revision.opacity')}
                className="min-w-0 flex-1"
              />
              <span className="shrink-0">{t('revision.label', { revision: compareRevision })}</span>
            </label>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="w-full text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
