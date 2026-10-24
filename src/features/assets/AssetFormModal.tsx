import { useEffect, useState } from 'react'
import { compressPhoto, savePinPhoto } from '../sync/savePinPhoto'
import { useAssetTypes } from './useAssetTypes'
import CountPhotoModal, { type CountResultDraft } from './CountPhotoModal'
import { useTranslation } from '../../i18n/LanguageContext'
import type { CountPoint, CountSource, Pin, PinUpdate } from '../../types/models'

interface Props {
  pin: Pin
  onClose: () => void
  onUpdate: (pinId: string, data: PinUpdate) => Promise<void>
  onDelete: (pinId: string) => Promise<void>
}

// Nilai option "Lainnya" — memicu prompt untuk mengetik jenis aset sendiri
const CUSTOM_TYPE = '__custom__'

interface CountPhotoDraft {
  src: string
  blob: Blob
  fileName: string
}

// Pin aset yang belum berisi apa pun (baru ditaruh lalu dibatalkan)
function isEmptyAsset(a: {
  assetType?: string
  quantity?: number
  notes?: string
  photoURL?: string | null
  countPhotoURL?: string | null
  localPhotoPending?: boolean
  localCountPhotoPending?: boolean
}) {
  return (
    !a.assetType &&
    !a.quantity &&
    !a.notes?.trim() &&
    !a.photoURL &&
    !a.countPhotoURL &&
    !a.localPhotoPending &&
    !a.localCountPhotoPending
  )
}

function Stepper({
  value,
  onChange,
  min = 0,
  max,
  large,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  large?: boolean
}) {
  const size = large ? 'h-12 w-12 text-xl' : 'h-10 w-10 text-lg'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`${size} rounded-lg border border-slate-300 font-bold text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:text-white`}
      >
        &minus;
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value))
          if (Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min, n)))
        }}
        className={`${large ? 'h-12 w-20 text-2xl' : 'h-10 w-16 text-lg'} rounded-lg border border-slate-300 bg-white text-center font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white`}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max ?? Infinity, value + 1))}
        disabled={max !== undefined && value >= max}
        className={`${size} rounded-lg border border-slate-300 font-bold text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:text-white`}
      >
        +
      </button>
    </div>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      )}
      {children}
    </div>
  )
}

export default function AssetFormModal({ pin, onClose, onUpdate, onDelete }: Props) {
  const { t } = useTranslation()
  const { assetTypes } = useAssetTypes({ fallbackToDefaults: true })
  const [assetType, setAssetType] = useState(pin.assetType ?? '')
  const [quantity, setQuantity] = useState(pin.quantity ?? 0)
  const [damaged, setDamaged] = useState(pin.damaged ?? 0)
  const [missing, setMissing] = useState(pin.missing ?? 0)
  const [notes, setNotes] = useState(pin.notes)
  const [countSource, setCountSource] = useState<CountSource>(pin.countSource ?? 'manual')
  const [countPoints, setCountPoints] = useState<CountPoint[]>(pin.countPoints ?? [])
  // Foto hitung baru yang belum disimpan
  const [countPhoto, setCountPhoto] = useState<CountPhotoDraft | null>(null)
  const [counting, setCounting] = useState<{ autoRunAI: boolean } | null>(null)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  // Foto bukti baru; baru di-upload saat Simpan, sama seperti field lain
  const [evidence, setEvidence] = useState<CountPhotoDraft | null>(null)
  const [preparingEvidence, setPreparingEvidence] = useState(false)

  useEffect(() => {
    return () => {
      if (countPhoto) URL.revokeObjectURL(countPhoto.src)
    }
  }, [countPhoto])

  useEffect(() => {
    return () => {
      if (evidence) URL.revokeObjectURL(evidence.src)
    }
  }, [evidence])

  const good = Math.max(0, quantity - damaged - missing)
  const countImageSrc = countPhoto?.src ?? pin.countPhotoURL ?? null

  const changeQuantity = (n: number) => {
    setQuantity(n)
    setCountSource('manual')
    // Rusak + hilang tidak boleh melebihi jumlah
    const nextDamaged = Math.min(damaged, n)
    setDamaged(nextDamaged)
    setMissing(Math.min(missing, n - nextDamaged))
  }

  const onCountPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPreparingPhoto(true)
    try {
      const blob = await compressPhoto(file)
      setCountPhoto({ src: URL.createObjectURL(blob), blob, fileName: file.name })
      setCountPoints([])
      setCounting({ autoRunAI: !!assetType && navigator.onLine })
    } finally {
      setPreparingPhoto(false)
    }
  }

  const onCountDone = (result: CountResultDraft) => {
    setCountPoints(result.points)
    setCountSource(result.usedAI ? 'ai' : 'manual')
    setQuantity(result.quantity)
    const nextDamaged = Math.min(damaged, result.quantity)
    setDamaged(nextDamaged)
    setMissing(Math.min(missing, result.quantity - nextDamaged))
    setCounting(null)
  }

  const onEvidenceSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPreparingEvidence(true)
    try {
      const blob = await compressPhoto(file)
      setEvidence({ src: URL.createObjectURL(blob), blob, fileName: file.name })
    } finally {
      setPreparingEvidence(false)
    }
  }

  // Tutup tanpa menyimpan. Pin aset yang masih kosong ikut dihapus supaya tidak
  // tertinggal sebagai penanda "0" di denah dan baris kosong di Excel.
  const onCancel = () => {
    if (isEmptyAsset(pin)) {
      onDelete(pin.id).catch((err) => console.error('Gagal menghapus aset kosong:', err))
    }
    onClose()
  }

  const onSave = () => {
    const nothingEntered =
      isEmptyAsset({ ...pin, assetType, quantity, notes }) && !countPhoto && !evidence
    if (nothingEntered) {
      onCancel()
      return
    }
    // Tidak di-await: saat offline, Firestore baru resolve setelah tersinkron ke
    // server, sementara snapshot lokal sudah langsung ter-update.
    onUpdate(pin.id, {
      assetType,
      category: assetType || pin.category,
      quantity,
      damaged,
      missing,
      notes,
      countSource,
      countPoints,
    }).catch((err) => console.error('Gagal menyimpan aset:', err))
    if (countPhoto) {
      savePinPhoto(pin, countPhoto.blob, countPhoto.fileName, 'countPhoto', onUpdate).catch((err) =>
        console.error('Gagal menyimpan foto hitung:', err),
      )
    }
    if (evidence) {
      savePinPhoto(pin, evidence.blob, evidence.fileName, 'photo', onUpdate).catch((err) =>
        console.error('Gagal menyimpan foto bukti:', err),
      )
    }
    onClose()
  }

  const onDeleteClick = () => {
    if (window.confirm(t('assetForm.deleteConfirm'))) {
      onDelete(pin.id).catch((err) => console.error('Gagal menghapus aset:', err))
      onClose()
    }
  }

  const evidenceToShow = evidence?.src ?? pin.photoURL
  const typeOptions = assetTypes.map((a) => a.name)
  if (assetType && !typeOptions.includes(assetType)) typeOptions.unshift(assetType)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-800 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('assetForm.title')}</h2>
          <button type="button" onClick={onCancel} className="text-2xl leading-none text-slate-400 dark:text-slate-500">
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <Section title={t('assetForm.assetType')}>
            <select
              value={assetType}
              onChange={(e) => {
                if (e.target.value !== CUSTOM_TYPE) {
                  setAssetType(e.target.value)
                  return
                }
                const custom = window.prompt(t('assetForm.customTypePrompt'))?.trim()
                if (custom) setAssetType(custom)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">{t('assetForm.pickAssetType')}</option>
              {typeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={CUSTOM_TYPE}>{t('assetForm.customType')}</option>
            </select>
          </Section>

          <Section title={t('assetForm.quantity')}>
            <div className="mb-3 flex items-center justify-between">
              <Stepper value={quantity} onChange={changeQuantity} large />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  countSource === 'ai'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {countSource === 'ai' ? 'AI' : t('assetForm.manual')}
              </span>
            </div>

            {countImageSrc && (
              <button
                type="button"
                onClick={() => setCounting({ autoRunAI: false })}
                className="relative mb-3 block w-full overflow-hidden rounded-lg"
              >
                <img src={countImageSrc} alt={t('count.photoAlt')} className="h-40 w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
                  {t('assetForm.reviewCount', { count: countPoints.length })}
                </span>
              </button>
            )}
            {!countImageSrc && pin.localCountPhotoPending && (
              <p className="mb-3 text-xs text-amber-600">{t('assetForm.countPhotoPending')}</p>
            )}

            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-400 px-3 py-3 text-sm font-semibold text-slate-900">
                {preparingPhoto ? t('assetForm.preparingPhoto') : t('assetForm.countFromPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onCountPhotoSelected}
                />
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">
                {preparingEvidence
                  ? t('assetForm.preparingPhoto')
                  : evidenceToShow
                    ? t('assetForm.changeEvidencePhoto')
                    : t('assetForm.evidencePhoto')}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onEvidenceSelected} />
              </label>
            </div>
            {!assetType && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('assetForm.aiNeedsType')}</p>}
            {evidenceToShow && (
              <img src={evidenceToShow} alt={t('pinForm.photoAlt')} className="mt-3 h-28 w-full rounded-lg object-cover" />
            )}
            {evidence && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('assetForm.savedOnSave')}</p>}
          </Section>

          <Section title={t('assetForm.condition')}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('assetForm.damaged')}</span>
                <Stepper value={damaged} onChange={setDamaged} max={quantity - missing} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('assetForm.missing')}</span>
                <Stepper value={missing} onChange={setMissing} max={quantity - damaged} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('assetForm.good')}</span>
                <span className="w-16 text-center text-lg font-bold text-green-600">{good}</span>
              </div>
            </div>
            {quantity === 0 && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('assetForm.fillQuantityFirst')}</p>
            )}
            <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('pinForm.notes')}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </Section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDeleteClick}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-red-600 dark:border-slate-700"
            >
              {t('assetForm.delete')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              {t('assetForm.cancel')}
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-[1.5] rounded-xl bg-amber-400 py-3 text-sm font-semibold text-slate-900"
            >
              {t('assetForm.save')}
            </button>
          </div>
        </div>
      </div>

      {counting && countImageSrc && (
        <CountPhotoModal
          imageSrc={countImageSrc}
          aiImage={countPhoto?.blob ?? countImageSrc}
          assetType={assetType}
          initialPoints={countPoints}
          autoRunAI={counting.autoRunAI}
          onCancel={() => setCounting(null)}
          onDone={onCountDone}
        />
      )}
    </div>
  )
}
