import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { Pin, Plan } from '../../types/models'

export interface OfflineDownloadResult {
  total: number
  failed: number
  // false = service worker belum mengendalikan halaman ini, jadi gambar tidak tersimpan
  storageActive: boolean
}

function preload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Dimuat sebagai <img> biasa, persis seperti di halaman denah, supaya entri
    // cache service worker (cloudinary-images) cocok dengan permintaan nantinya.
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

// Siapkan satu proyek untuk dipakai tanpa sinyal: data pin & anotasi tiap denah
// masuk ke cache Firestore, dan semua gambar denah + foto masuk ke cache gambar.
export async function downloadProjectForOffline(
  projectId: string,
  plans: Plan[],
  onProgress: (done: number, total: number) => void,
): Promise<OfflineDownloadResult> {
  const urls = new Set<string>()
  for (const plan of plans) {
    if (plan.imageURL) urls.add(plan.imageURL)
    const base = collection(db, 'projects', projectId, 'plans', plan.id, 'pins')
    const pins = await getDocs(base)
    for (const d of pins.docs) {
      const pin = d.data() as Omit<Pin, 'id'>
      if (pin.photoURL) urls.add(pin.photoURL)
      if (pin.countPhotoURL) urls.add(pin.countPhotoURL)
      for (const p of pin.extraPhotos ?? []) urls.add(p.url)
    }
    // Anotasi boleh gagal (aturan Firestore lama); denah tetap bisa dipakai
    await getDocs(collection(db, 'projects', projectId, 'plans', plan.id, 'annotations')).catch(() => null)
  }

  const queue = [...urls]
  const total = queue.length
  let done = 0
  let failed = 0
  onProgress(0, total)
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (!(await preload(url))) failed++
      onProgress(++done, total)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  return { total, failed, storageActive: !!navigator.serviceWorker?.controller }
}
