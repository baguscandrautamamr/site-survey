import type { VercelRequest, VercelResponse } from '@vercel/node'

const firebaseApiKey = process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID

// Verifies the caller's Firebase ID token and checks that they are an admin.
// No service account is needed: the token is validated by the Identity Toolkit
// API, and the role is read through the Firestore REST API as the caller, so
// firestore.rules (including the ban check) still apply.
async function requireAdmin(req: VercelRequest): Promise<{ status: number; error: string } | null> {
  if (!firebaseApiKey || !firebaseProjectId) {
    return { status: 503, error: 'Env var VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID belum diisi di Vercel.' }
  }

  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!idToken) return { status: 401, error: 'Butuh login.' }

  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) },
  )
  if (!lookup.ok) return { status: 401, error: 'Sesi tidak valid, silakan login ulang.' }
  const { users } = (await lookup.json()) as { users?: { localId: string; disabled?: boolean }[] }
  const account = users?.[0]
  if (!account || account.disabled) return { status: 401, error: 'Sesi tidak valid, silakan login ulang.' }

  const profile = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/(default)/documents/users/${encodeURIComponent(account.localId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  )
  if (!profile.ok) return { status: 403, error: 'Hanya admin yang boleh mengakses.' }
  const data = (await profile.json()) as { fields?: { role?: { stringValue?: string } } }
  if (data.fields?.role?.stringValue !== 'admin') return { status: 403, error: 'Hanya admin yang boleh mengakses.' }

  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const denied = await requireAdmin(req)
    if (denied) return res.status(denied.status).json({ error: denied.error })
  } catch (e) {
    return res.status(504).json({ error: `Gagal memverifikasi login: ${e instanceof Error ? e.message : String(e)}` })
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.VITE_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      error:
        'Env var belum lengkap. Tambahkan CLOUDINARY_API_KEY dan CLOUDINARY_API_SECRET di Vercel → Settings → Environment Variables, lalu Redeploy.',
    })
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
    })

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return res.status(502).json({ error: `Cloudinary response tidak valid: ${text.slice(0, 200)}` })
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Cloudinary error ${response.status}: ${JSON.stringify(data)}` })
    }

    return res.json(data)
  } catch (e) {
    return res.status(504).json({ error: `Gagal menghubungi Cloudinary: ${e instanceof Error ? e.message : String(e)}` })
  }
}
