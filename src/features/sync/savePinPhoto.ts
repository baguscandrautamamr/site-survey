import imageCompression from 'browser-image-compression'
import { arrayUnion } from 'firebase/firestore'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { queuePhoto } from './syncManager'
import type { PinPhotoField } from './pendingPhotosDb'
import type { Pin, PinPhoto, PinUpdate } from '../../types/models'

export function compressPhoto(file: File) {
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1,
    useWebWorker: true,
  })
}

// Upload foto pin ke Cloudinary; kalau offline atau upload gagal, masuk antrean
// IndexedDB dan dikirim ulang oleh syncManager saat online.
export async function savePinPhoto(
  pin: Pin,
  blob: Blob,
  fileName: string,
  field: PinPhotoField,
  onUpdate: (pinId: string, data: PinUpdate) => Promise<void>,
) {
  const pendingUpdate: PinUpdate =
    field === 'countPhoto' ? { localCountPhotoPending: true } : { localPhotoPending: true }

  const enqueue = async () => {
    await queuePhoto({
      projectId: pin.projectId,
      planId: pin.planId,
      pinId: pin.id,
      blob,
      fileName,
      contentType: blob.type,
      field,
    })
    await onUpdate(pin.id, pendingUpdate)
  }

  if (!navigator.onLine) {
    await enqueue()
    return
  }

  try {
    const prefix = field === 'countPhoto' ? 'count' : field === 'extra' ? 'extra' : 'pin'
    const { url, publicId } = await uploadToCloudinary(blob, `${prefix}-${pin.id}-${fileName}`)
    await onUpdate(
      pin.id,
      field === 'extra'
        ? // arrayUnion supaya dua foto yang diunggah berdekatan tidak saling menimpa
          { extraPhotos: arrayUnion({ url, path: publicId }) as unknown as PinPhoto[] }
        : field === 'countPhoto'
        ? { countPhotoPath: publicId, countPhotoURL: url, localCountPhotoPending: false }
        : { photoPath: publicId, photoURL: url, localPhotoPending: false },
    )
  } catch {
    // Upload gagal (mis. koneksi putus di tengah upload) — pakai antrean offline.
    await enqueue()
  }
}
