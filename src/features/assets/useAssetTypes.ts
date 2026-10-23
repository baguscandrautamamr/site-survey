import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { AssetType } from '../../types/models'

export const DEFAULT_ASSET_TYPES: Array<{ id: string; name: string }> = [
  { id: 'default-downlight', name: 'Lampu downlight' },
  { id: 'default-tl', name: 'Lampu TL' },
  { id: 'default-socket', name: 'Stop kontak' },
  { id: 'default-switch', name: 'Saklar' },
  { id: 'default-smoke', name: 'Smoke detector' },
  { id: 'default-sprinkler', name: 'Sprinkler' },
  { id: 'default-apar', name: 'APAR' },
  { id: 'default-ac', name: 'AC' },
  { id: 'default-cctv', name: 'CCTV' },
]

const FALLBACK_ASSET_TYPES: AssetType[] = DEFAULT_ASSET_TYPES.map((a) => ({ ...a, createdAt: 0 }))

// fallbackToDefaults: tampilkan daftar bawaan selama master di Firestore masih
// kosong atau belum bisa dibaca (mis. aturan Firestore belum di-deploy), supaya
// form aset tetap bisa dipakai. Halaman admin memakai data asli saja.
export function useAssetTypes({ fallbackToDefaults = false }: { fallbackToDefaults?: boolean } = {}) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'assetTypes'), orderBy('name', 'asc'))
    return onSnapshot(
      q,
      (snap) => {
        setAssetTypes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssetType, 'id'>) })))
        setLoading(false)
      },
      (err) => {
        console.error('Gagal memuat jenis aset:', err)
        setLoading(false)
      },
    )
  }, [])

  if (fallbackToDefaults && !loading && assetTypes.length === 0) {
    return { assetTypes: FALLBACK_ASSET_TYPES, loading }
  }
  return { assetTypes, loading }
}

export async function seedDefaultAssetTypesIfEmpty() {
  const snap = await getDocs(collection(db, 'assetTypes'))
  if (!snap.empty) return
  await Promise.all(
    DEFAULT_ASSET_TYPES.map(({ id, ...a }) =>
      setDoc(doc(db, 'assetTypes', id), { ...a, createdAt: serverTimestamp() }),
    ),
  )
}

export async function addAssetType(name: string) {
  await addDoc(collection(db, 'assetTypes'), { name, createdAt: serverTimestamp() })
}

export async function renameAssetType(id: string, name: string) {
  await updateDoc(doc(db, 'assetTypes', id), { name })
}

export async function deleteAssetType(id: string) {
  await deleteDoc(doc(db, 'assetTypes', id))
}
