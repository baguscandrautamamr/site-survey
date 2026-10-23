import { useState } from 'react'
import { compressPhoto, savePinPhoto } from '../sync/savePinPhoto'
import { useCategories } from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Pin, PinStatus, PinUpdate } from '../../types/models'

interface Props {
  pin: Pin
  onClose: () => void
  onUpdate: (pinId: string, data: PinUpdate) => Promise<void>
}

const STATUSES: PinStatus[] = ['open', 'in_progress', 'done']

export default function PinFormModal({ pin, onClose, onUpdate }: Props) {
  const { categories } = useCategories()
  const { t } = useTranslation()
  const [notes, setNotes] = useState(pin.notes)
  const [category, setCategory] = useState(pin.category)
  const [status, setStatus] = useState(pin.status)
  const [savingText, setSavingText] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const saveTextFields = async (next: Partial<Pick<Pin, 'status' | 'category' | 'notes'>>) => {
    setSavingText(true)
    try {
      await onUpdate(pin.id, next)
    } finally {
      setSavingText(false)
    }
  }

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    try {
      const compressed = await compressPhoto(file)
      await savePinPhoto(pin, compressed, file.name, 'photo', onUpdate)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const photoToShow = localPreview ?? pin.photoURL

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-2xl bg-white p-4 dark:bg-slate-800 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pinForm.title')}</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 dark:text-slate-500">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('pinForm.status')}</label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s)
                    saveTextFields({ status: s })
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    status === s
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                      : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('pinForm.category')}</label>
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value
                setCategory(val)
                saveTextFields({ category: val })
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('pinForm.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => saveTextFields({ notes })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('pinForm.photo')}</label>
            {photoToShow && (
              <button type="button" onClick={() => setLightboxOpen(true)} className="mb-2 block w-full">
                <img
                  src={photoToShow}
                  alt={t('pinForm.photoAlt')}
                  className="h-40 w-full rounded-lg object-cover"
                />
              </button>
            )}
            <label className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400">
              {uploadingPhoto ? t('pinForm.uploadingPhoto') : photoToShow ? t('pinForm.changePhoto') : t('pinForm.takePhoto')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhotoSelected}
              />
            </label>
          </div>

          {savingText && <p className="text-xs text-slate-400 dark:text-slate-500">{t('pinForm.saving')}</p>}
        </div>
      </div>

      {lightboxOpen && photoToShow && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 text-3xl leading-none text-white"
            aria-label={t('pinForm.close')}
          >
            &times;
          </button>
          <img
            src={photoToShow}
            alt={t('pinForm.photoAlt')}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
