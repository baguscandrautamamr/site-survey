import { auth } from '../firebase/config'
import type { CountPoint } from '../types/models'

export interface CountResult {
  count: number
  points: CountPoint[]
  note: string
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Minta AI (lewat /api/count-objects) menghitung objek di foto. `image` boleh
// Blob lokal (dikirim sebagai data URL) atau URL foto yang sudah di-upload.
export async function countObjectsWithAI(image: Blob | string, assetType: string): Promise<CountResult> {
  const idToken = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/count-objects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      image: typeof image === 'string' ? image : await blobToDataUrl(image),
      assetType,
    }),
  })
  const text = await res.text()
  let data: Partial<CountResult> & { error?: string }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error(`Server error (non-JSON): ${text.slice(0, 150)}`)
  }
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return { count: data.count ?? 0, points: data.points ?? [], note: data.note ?? '' }
}
