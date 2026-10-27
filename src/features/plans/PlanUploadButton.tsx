import { useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import { FLOOR_SUGGESTIONS, guessFloorFromName } from './floors'

interface Props {
  uploading: boolean
  onUpload: (name: string, file: File, floor: string) => Promise<void>
  variant?: 'primary' | 'tile'
  // Lantai yang sudah dipakai di proyek ini, ditawarkan sebagai pilihan cepat
  existingFloors?: string[]
}

export default function PlanUploadButton({ uploading, onUpload, variant = 'primary', existingFloors = [] }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ file: File; name: string; floor: string }[]>([])
  const [progress, setProgress] = useState(0)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPending(
      files.map((file) => {
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        return { file, name: baseName, floor: guessFloorFromName(baseName) }
      }),
    )
  }

  const reset = () => {
    setPending([])
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const updateItem = (i: number, patch: Partial<{ name: string; floor: string }>) =>
    setPending((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const onConfirm = async () => {
    if (!pending.length || pending.some((p) => !p.name.trim())) return
    // Diunggah berurutan agar konversi PDF tidak membebani perangkat
    for (let i = 0; i < pending.length; i++) {
      setProgress(i + 1)
      await onUpload(pending[i].name.trim(), pending[i].file, pending[i].floor.trim())
    }
    reset()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
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

      {pending.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={reset}>
          <div
            className="flex max-h-full w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {pending.map((p, i) => (
              <div key={i} className="flex flex-col gap-2 border-b border-slate-200 pb-3 last:border-b-0 dark:border-slate-700">
                {pending.length > 1 && <span className="truncate text-xs text-slate-400">{p.file.name}</span>}
                <input
                  autoFocus={i === 0}
                  value={p.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder={t('plans.namePlaceholder')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:bg-slate-700 dark:text-white"
                />
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('plans.floor')}
                  <input
                    value={p.floor}
                    onChange={(e) => updateItem(i, { floor: e.target.value })}
                    list="plan-floor-options"
                    placeholder={t('plans.floorPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-normal text-slate-900 focus:border-slate-900 focus:outline-none dark:bg-slate-700 dark:text-white"
                  />
                </label>
              </div>
            ))}
            <datalist id="plan-floor-options">
              {[...new Set([...existingFloors, ...FLOOR_SUGGESTIONS])].map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <span className="text-xs text-slate-400">{t('plans.floorHelp')}</span>
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
                disabled={uploading || progress > 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading || progress > 0
                  ? `${t('plans.uploading')}${pending.length > 1 ? ` ${progress}/${pending.length}` : ''}`
                  : t('plans.uploadConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
