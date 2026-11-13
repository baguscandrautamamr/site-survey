import { openDB, type IDBPDatabase } from 'idb'

export interface PendingPhotoRecord {
  id: string
  projectId: string
  planId: string
  pinId: string
  blob: Blob
  fileName: string
  contentType: string
  createdAt: number
  // Field pin yang diisi saat sync. Record lama tanpa field ini = foto temuan biasa.
  field?: PinPhotoField
  // Hasil upload Cloudinary, disimpan begitu upload berhasil supaya percobaan
  // ulang (kalau update Firestore gagal) tidak meng-upload foto yang sama lagi.
  uploaded?: { url: string; publicId: string }
}

// 'extra' = foto tambahan, ditambahkan ke array extraPhotos
export type PinPhotoField = 'photo' | 'countPhoto' | 'extra'

const DB_NAME = 'survey-pending-photos'
const STORE_NAME = 'photos'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function addPendingPhoto(record: PendingPhotoRecord) {
  const db = await getDb()
  await db.put(STORE_NAME, record)
}

export async function getAllPendingPhotos(): Promise<PendingPhotoRecord[]> {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function deletePendingPhoto(id: string) {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}
