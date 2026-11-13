import { firestoreDocUrl, type AuthFailure, type AuthedUser } from './auth.js'

// Harus sama dengan batas `count <= 100` pada /aiUsage di firestore.rules.
export const AI_DAILY_LIMIT = 100

const DAY_MS = 86_400_000

interface UsageDoc {
  fields?: { day?: { integerValue?: string }; count?: { integerValue?: string } }
}

// Mencatat satu pemakaian AI untuk pengguna ini dan menolak kalau jatah harian
// habis. Penghitung disimpan di Firestore (aiUsage/{uid}) dan ditulis memakai
// token pengguna sendiri, jadi tidak butuh service account; firestore.rules yang
// menjamin hitungan tidak bisa diturunkan atau di-reset dari browser.
export async function consumeAiQuota(user: AuthedUser): Promise<AuthFailure | null> {
  const url = firestoreDocUrl('aiUsage', user.uid)
  const headers = { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' }
  const today = Math.floor(Date.now() / DAY_MS)

  const current = await fetch(url, { headers })
  let used = 0
  if (current.ok) {
    const { fields } = (await current.json()) as UsageDoc
    if (Number(fields?.day?.integerValue) === today) used = Number(fields?.count?.integerValue) || 0
  } else if (current.status !== 404) {
    return { status: 503, error: quotaUnavailable(current.status) }
  }

  if (used >= AI_DAILY_LIMIT) {
    return {
      status: 429,
      error: `Batas hitung AI harian (${AI_DAILY_LIMIT}x) sudah tercapai. Coba lagi besok atau isi jumlah secara manual.`,
    }
  }

  const write = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: { day: { integerValue: String(today) }, count: { integerValue: String(used + 1) } },
    }),
  })
  if (!write.ok) return { status: 503, error: quotaUnavailable(write.status) }
  return null
}

function quotaUnavailable(status: number) {
  return `Tidak bisa mencatat pemakaian AI (Firestore ${status}). Pastikan firestore.rules terbaru sudah di-deploy, lalu coba lagi.`
}
