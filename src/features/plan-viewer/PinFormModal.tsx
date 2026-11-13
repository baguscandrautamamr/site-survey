import { useState } from 'react'
import { useCategories } from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'
import { PinAuthorInfo } from '../pins/pinAuthors'
import PinPhotos from '../pins/PinPhotos'
import MeasurementsEditor, { cleanMeasurements } from '../pins/MeasurementsEditor'
import type { FindingType, Measurement, Pin, PinStatus, PinUpdate } from '../../types/models'

interface Props {
  pin: Pin
  onClose: () => void
  onUpdate: (pinId: string, data: PinUpdate) => Promise<void>
  onDelete: (pinId: string) => Promise<void>
}

const STATUSES: PinStatus[] = ['open', 'in_progress', 'done']
const FINDING_TYPES: FindingType[] = ['general', 'deviation']

export default function PinFormModal({ pin, onClose, onUpdate, onDelete }: Props) {
  const { categories } = useCategories()
  const { t } = useTranslation()
  const [notes, setNotes] = useState(pin.notes)
  const [category, setCategory] = useState(pin.category)
  const [status, setStatus] = useState(pin.status)
  const [findingType, setFindingType] = useState<FindingType>(pin.findingType ?? 'general')
  const [measurements, setMeasurements] = useState<Measurement[]>(pin.measurements ?? [])
  const [savingText, setSavingText] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  const saveFields = async (next: PinUpdate) => {
    setSavingText(true)
    try {
      await onUpdate(pin.id, next)
    } finally {
      setSavingText(false)
    }
  }

  const saveMeasurements = (list: Measurement[]) => {
    const cleaned = cleanMeasurements(list)
    // Jangan catat sebagai "diubah" kalau isinya tidak berubah
    if (JSON.stringify(cleaned) !== JSON.stringify(pin.measurements ?? [])) saveFields({ measurements: cleaned })
  }

  // Temuan yang tidak berisi apa pun tidak berguna; hapus saat ditutup supaya
  // tidak tertinggal sebagai pin kosong di denah, punch list, dan Excel.
  const onCloseClick = () => {
    const isEmpty =
      !notes.trim() &&
      !pin.photoURL &&
      !pin.localPhotoPending &&
      !pin.extraPhotos?.length &&
      !photoBusy &&
      findingType === 'general' &&
      cleanMeasurements(measurements).length === 0
    if (isEmpty) {
      onDelete(pin.id).catch((err) => console.error('Gagal menghapus temuan kosong:', err))
    } else {
      // Ukuran yang masih diketik (belum blur) ikut tersimpan
      saveMeasurements(measurements)
    }
    onClose()
  }

  const label = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'
  const chip = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
      active
        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
        : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <div className="max-h-full w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-800 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pinForm.title')}</h2>
          <button type="button" onClick={onCloseClick} className="text-2xl leading-none text-slate-400 dark:text-slate-500">
            &times;
          </button>
        </div>

        <PinAuthorInfo pin={pin} />

        <div className="space-y-4">
          <div>
            <label className={label}>{t('pinForm.findingType')}</label>
            <div className="flex gap-2">
              {FINDING_TYPES.map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => {
                    if (ft === findingType) return
                    setFindingType(ft)
                    saveFields({ findingType: ft })
                  }}
                  className={chip(findingType === ft)}
                >
                  {t(`findingType.${ft}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>{t('pinForm.status')}</label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === status) return
                    setStatus(s)
                    saveFields({ status: s })
                  }}
                  className={chip(status === s)}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>{t('pinForm.category')}</label>
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value
                setCategory(val)
                saveFields({ category: val })
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
            <label className={label}>{t('pinForm.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                // Jangan catat sebagai "diubah" kalau isinya tidak berubah
                if (notes !== pin.notes) saveFields({ notes })
              }}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className={label}>{t('measure.title')}</label>
            <MeasurementsEditor value={measurements} onChange={setMeasurements} onCommit={saveMeasurements} />
          </div>

          <div>
            <label className={label}>{t('pinForm.photo')}</label>
            <PinPhotos pin={pin} onUpdate={onUpdate} includePrimary onBusyChange={setPhotoBusy} />
          </div>

          {/* Selalu dirender (invisible saat tidak menyimpan) supaya tinggi sheet tidak berubah:
              kalau berubah saat catatan blur, tombol × bergeser di tengah tap dan tap-nya meleset */}
          <p className={`text-xs text-slate-400 dark:text-slate-500 ${savingText ? '' : 'invisible'}`}>{t('pinForm.saving')}</p>
        </div>
      </div>
    </div>
  )
}
