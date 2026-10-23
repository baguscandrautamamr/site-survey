import { useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

interface Props {
  uploading: boolean
  onUpload: (name: string, file: File) => Promise<void>
  variant?: 'primary' | 'tile'
}

export default function PlanUploadButton({ uploading, onUpload, variant = 'primary' }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setName(file.name.replace(/\.[^/.]+$/, ''))
  }

  const reset = () => {
    setPendingFile(null)
    setName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const onConfirm = async () => {
    if (!pendingFile || !name.trim()) return
    await onUpload(name.trim(), pendingFile)
    reset()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {variant === 'tile' ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:border-slate-600 dark:text-slate-500"
        >
          {t('plans.newPlan')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('plans.newPlan')}
        </button>
      )}

      {pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={reset}>
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-white p-4 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('plans.namePlaceholder')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:bg-slate-700 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                {t('plans.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={uploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading ? t('plans.uploading') : t('plans.uploadConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
