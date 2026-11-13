import { useEffect, useState } from 'react'
import { compressPhoto, savePinPhoto } from '../sync/savePinPhoto'
import { useTranslation } from '../../i18n/LanguageContext'
import PhotoMarkupModal from './PhotoMarkupModal'
import type { Pin, PinUpdate } from '../../types/models'

interface Props {
  pin: Pin
  onUpdate: (pinId: string, data: PinUpdate) => Promise<void>
  // true: galeri juga mengelola foto utama (photoURL). false: hanya foto tambahan
  includePrimary?: boolean
  onBusyChange?: (busy: boolean) => void
}

interface Shown {
  key: string
  url: string
  // null = foto utama
  extraIndex: number | null
}

// Galeri foto sebuah pin: banyak foto, tiap foto bisa dicoret dulu sebelum disimpan.
export default function PinPhotos({ pin, onUpdate, includePrimary = false, onBusyChange }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [preparing, setPreparing] = useState(false)
  // Pratinjau lokal foto yang sedang diunggah / masuk antrean offline
  const [uploads, setUploads] = useState<{ id: number; src: string }[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  const busy = preparing || uploads.length > 0 || !!draft
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  const extras = pin.extraPhotos ?? []
  const shown: Shown[] = [
    ...(includePrimary && pin.photoURL ? [{ key: 'primary', url: pin.photoURL, extraIndex: null }] : []),
    ...extras.map((p, i) => ({ key: p.path || p.url, url: p.url, extraIndex: i })),
  ]

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPreparing(true)
    try {
      setDraft({ blob: await compressPhoto(file), fileName: file.name })
    } finally {
      setPreparing(false)
    }
  }

  const onMarkupDone = async (blob: Blob) => {
    if (!draft) return
    const { fileName } = draft
    setDraft(null)
    const id = Date.now()
    const src = URL.createObjectURL(blob)
    setUploads((prev) => [...prev, { id, src }])
    // Foto pertama sebuah temuan menjadi foto utama (yang tampil di daftar & Excel)
    const asPrimary = includePrimary && !pin.photoURL && !pin.localPhotoPending && uploads.length === 0
    try {
      await savePinPhoto(pin, blob, fileName, asPrimary ? 'photo' : 'extra', onUpdate)
    } catch (err) {
      console.error('Gagal menyimpan foto:', err)
    } finally {
      setUploads((prev) => prev.filter((u) => u.id !== id))
      URL.revokeObjectURL(src)
    }
  }

  const onRemove = (photo: Shown) => {
    if (!window.confirm(t('pinPhotos.removeConfirm'))) return
    const update: PinUpdate =
      photo.extraIndex === null
        ? { photoURL: null, photoPath: null }
        : { extraPhotos: extras.filter((_, i) => i !== photo.extraIndex) }
    onUpdate(pin.id, update).catch((err) => console.error('Gagal menghapus foto:', err))
  }

  return (
    <div>
      {(shown.length > 0 || uploads.length > 0) && (
        <ul className="mb-2 grid grid-cols-3 gap-2">
          {shown.map((photo) => (
            <li key={photo.key} className="relative">
              <button type="button" onClick={() => setLightbox(photo.url)} className="block w-full">
                <img src={photo.url} alt={t('pinForm.photoAlt')} className="aspect-square w-full rounded-lg object-cover" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(photo)}
                aria-label={t('pinPhotos.remove')}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white"
              >
                &times;
              </button>
            </li>
          ))}
          {uploads.map((u) => (
            <li key={u.id} className="relative">
              <img src={u.src} alt="" className="aspect-square w-full rounded-lg object-cover opacity-50" />
              <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-semibold text-white drop-shadow">
                {t('pinForm.uploadingPhoto')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {pin.localPhotoPending && uploads.length === 0 && (
        <p className="mb-2 text-xs text-amber-600">{t('pinPhotos.pending')}</p>
      )}

      <label className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400">
        {preparing ? t('pinPhotos.preparing') : shown.length + uploads.length > 0 ? t('pinPhotos.addMore') : t('pinForm.takePhoto')}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={preparing} />
      </label>

      {draft && <PhotoMarkupModal blob={draft.blob} onDone={onMarkupDone} onCancel={() => setDraft(null)} />}

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 text-3xl leading-none text-white"
            aria-label={t('pinForm.close')}
          >
            &times;
          </button>
          <img src={lightbox} alt={t('pinForm.photoAlt')} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
