import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
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
        const { url: photoURL, publicId: photoPath } = await uploadToCloudinary(
          item.blob,
          `pin-${item.pinId}-${item.fileName}`,
        )
        await updateDoc(
          doc(db, 'projects', item.projectId, 'plans', item.planId, 'pins', item.pinId),
          {
            photoPath,
            photoURL,
            localPhotoPending: false,
            updatedAt: serverTimestamp(),
          },
        )
        await deletePendingPhoto(item.id)
      } catch (err) {
        console.error('Failed to sync queued photo', item.id, err)
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
