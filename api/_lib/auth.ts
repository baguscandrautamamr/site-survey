import type { VercelRequest } from '@vercel/node'

const firebaseApiKey = process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID
// Standard Firebase emulator env vars, for local testing (e.g. `vercel dev`)
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST
const identityToolkitBase = authEmulatorHost
  ? `http://${authEmulatorHost}/identitytoolkit.googleapis.com`
  : 'https://identitytoolkit.googleapis.com'
const firestoreBase = firestoreEmulatorHost ? `http://${firestoreEmulatorHost}` : 'https://firestore.googleapis.com'

export interface AuthFailure {
  status: number
  error: string
}

// Verifies the caller's Firebase ID token and loads their profile. No service
// account is needed: the token is validated by the Identity Toolkit API, and
// the profile is read through the Firestore REST API as the caller, so
// firestore.rules (including the ban check) still apply. Files under api/_lib
// are not deployed as functions (Vercel skips underscore-prefixed paths).
export async function requireUser(
  req: VercelRequest,
  { admin = false }: { admin?: boolean } = {},
): Promise<AuthFailure | null> {
  if (!firebaseApiKey || !firebaseProjectId) {
    return { status: 503, error: 'Env var VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID belum diisi di Vercel.' }
  }

  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!idToken) return { status: 401, error: 'Butuh login.' }

  const lookup = await fetch(
    `${identityToolkitBase}/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) },
  )
  if (!lookup.ok) return { status: 401, error: 'Sesi tidak valid, silakan login ulang.' }
  const { users } = (await lookup.json()) as { users?: { localId: string; disabled?: boolean }[] }
  const account = users?.[0]
  if (!account || account.disabled) return { status: 401, error: 'Sesi tidak valid, silakan login ulang.' }

  const profile = await fetch(
    `${firestoreBase}/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/(default)/documents/users/${encodeURIComponent(account.localId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  )
  if (!profile.ok) return { status: 403, error: 'Akun tidak aktif.' }
  if (admin) {
    const data = (await profile.json()) as { fields?: { role?: { stringValue?: string } } }
    if (data.fields?.role?.stringValue !== 'admin') return { status: 403, error: 'Hanya admin yang boleh mengakses.' }
  }

  return null
}
