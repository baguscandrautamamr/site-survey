import { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import { TEXT_FONT_SIZES } from './annotations'

interface Props {
  initialText?: string
  initialFontSize?: number
  onSave: (text: string, fontSize: number) => void
  onClose: () => void
}

export default function TextBoxModal({ initialText = '', initialFontSize = 16, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)
  const [fontSize, setFontSize] = useState(initialFontSize)

  const save = () => {
    if (text.trim()) onSave(text, fontSize)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('planViewer.textModalTitle')}
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

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('planViewer.textPlaceholder')}
          rows={3}
          className="w-full rounded-lg border border-blue-400 p-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-white"
        />

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {TEXT_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setFontSize(size)}
              aria-pressed={fontSize === size}
              className={`h-8 w-9 rounded-md text-xs font-semibold ${
                fontSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {size}
            </button>
          ))}
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
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            {t('planViewer.textSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
