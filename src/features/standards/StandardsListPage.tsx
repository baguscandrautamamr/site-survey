import { useRef, useState } from 'react'
import { useStandards } from './useStandards'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Standard } from '../../types/models'

const STANDARD_TYPES: Standard['type'][] = ['NFPA', 'NEC', 'SNI', 'IEC', 'Other']

const TYPE_COLORS: Record<Standard['type'], string> = {
  NFPA: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  NEC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SNI: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  IEC: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export default function StandardsListPage() {
  const { standards, loading, addStandard, deleteStandard } = useStandards()
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<Standard['type']>('NFPA')
  const [uploading, setUploading] = useState(false)
  const [filterType, setFilterType] = useState<Standard['type'] | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !name.trim()) return
    setUploading(true)
    try {
      await addStandard(file, name.trim(), type)
      setName('')
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      alert(err instanceof Error ? err.message : t('standards.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (standard: Standard) => {
    if (window.confirm(t('standards.deleteConfirm', { name: standard.name }))) {
      await deleteStandard(standard.id)
    }
  }

  const filtered = filterType === 'all' ? standards : standards.filter((s) => s.type === filterType)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('standards.title')}</h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {t('standards.upload')}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('standards.formName')}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('standards.namePlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('standards.formType')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Standard['type'])}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {STANDARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('standards.formFile')}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="w-full text-sm text-slate-700 dark:text-slate-300"
            />
          </div>
          <button
            type="button"
            onClick={onUpload}
            disabled={uploading || !name.trim()}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {uploading ? t('standards.uploading') : t('standards.uploadConfirm')}
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['all', ...STANDARD_TYPES] as const).map((ft) => (
          <button
            key={ft}
            type="button"
            onClick={() => setFilterType(ft)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filterType === ft
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400'
            }`}
          >
            {ft === 'all' ? t('status.all') : ft}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t('app.loading')}</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('standards.empty')}</p>
      )}

      <ul className="space-y-2">
        {filtered.map((std) => (
          <li
            key={std.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${TYPE_COLORS[std.type]}`}>
                {std.type}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{std.name}</p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{std.fileName}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={std.pdfURL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                {t('standards.open')}
              </a>
              <button
                type="button"
                onClick={() => onDelete(std)}
                className="rounded border border-red-300 px-2 py-1.5 text-xs text-red-500 dark:border-red-800 dark:text-red-400"
              >
                &#128465;
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
