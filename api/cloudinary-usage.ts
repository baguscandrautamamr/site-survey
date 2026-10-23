import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUser } from './_lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const denied = await requireUser(req, { admin: true })
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
