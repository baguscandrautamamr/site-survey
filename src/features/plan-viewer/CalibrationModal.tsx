import { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

interface Props {
  pixels: number
  onSave: (meters: number) => void
  onClose: () => void
}

export default function CalibrationModal({ pixels, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  const meters = parseFloat(value.replace(',', '.'))
  const valid = !isNaN(meters) && meters > 0

  const save = () => {
    if (valid) onSave(meters)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-sm overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('planViewer.calibrateTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('planViewer.textCancel')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            &times;
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {t('planViewer.calibrateHelp', { pixels: Math.round(pixels) })}
        </p>

        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            placeholder={t('planViewer.calibratePlaceholder')}
            className="w-full rounded-lg border border-blue-400 p-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-white"
          />
          <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">m</span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
          >
            {t('planViewer.textCancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {t('planViewer.calibrateSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
