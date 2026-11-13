import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { uploadToCloudinary } from '../../lib/cloudinary'
import {
  addPendingPhoto,
  deletePendingPhoto,
  getAllPendingPhotos,
  type PendingPhotoRecord,
} from './pendingPhotosDb'

type Listener = (count: number) => void
const listeners = new Set<Listener>()
let draining = false

async function notify() {
  const all = await getAllPendingPhotos()
  listeners.forEach((l) => l(all.length))
}

export function subscribePendingCount(listener: Listener) {
  listeners.add(listener)
  notify()
  return () => {
    listeners.delete(listener)
  }
}

export async function queuePhoto(record: Omit<PendingPhotoRecord, 'id' | 'createdAt'>) {
  const id = `${record.pinId}-${Date.now()}`
  await addPendingPhoto({ ...record, id, createdAt: Date.now() })
  await notify()
}

export async function drainQueue() {
  if (draining) return
  draining = true
  try {
    const pending = await getAllPendingPhotos()
    for (const item of pending) {
      try {
        let uploaded = item.uploaded
        if (!uploaded) {
          const prefix = item.field === 'countPhoto' ? 'count' : item.field === 'extra' ? 'extra' : 'pin'
          uploaded = await uploadToCloudinary(item.blob, `${prefix}-${item.pinId}-${item.fileName}`)
          await addPendingPhoto({ ...item, uploaded })
        }
        const { url: photoURL, publicId: photoPath } = uploaded
        await updateDoc(
          doc(db, 'projects', item.projectId, 'plans', item.planId, 'pins', item.pinId),
          item.field === 'extra'
            ? {
                extraPhotos: arrayUnion({ url: photoURL, path: photoPath }),
                localPhotoPending: false,
                updatedAt: serverTimestamp(),
              }
            : item.field === 'countPhoto'
            ? {
                countPhotoPath: photoPath,
                countPhotoURL: photoURL,
                localCountPhotoPending: false,
                updatedAt: serverTimestamp(),
              }
            : {
                photoPath,
                photoURL,
                localPhotoPending: false,
                updatedAt: serverTimestamp(),
              },
        )
        await deletePendingPhoto(item.id)
      } catch (err) {
        console.error('Failed to sync queued photo', item.id, err)
        // Pin sudah dihapus atau akses dicabut: mencoba lagi tidak akan pernah
        // berhasil, jadi buang dari antrean daripada mengulang selamanya.
        const code = (err as { code?: string }).code
        if (code === 'not-found' || code === 'permission-denied') {
          await deletePendingPhoto(item.id).catch(() => {})
        }
      }
    }
  } finally {
    draining = false
    await notify()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    drainQueue()
  })
  setInterval(() => {
    if (navigator.onLine) drainQueue()
  }, 30000)
  drainQueue()
}
