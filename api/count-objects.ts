import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUser } from './_lib/auth.js'

// Any OpenAI-compatible chat completions API with vision support
// (OpenAI, OpenRouter, Together, a self-hosted gateway, ...).
const aiApiKey = process.env.AI_API_KEY
const aiModel = process.env.AI_MODEL
const aiBaseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

const MAX_POINTS = 500

function chatCompletionsUrl() {
  return aiBaseUrl.endsWith('/chat/completions') ? aiBaseUrl : `${aiBaseUrl}/chat/completions`
}

function buildPrompt(assetType: string) {
  return [
    `Hitung semua objek "${assetType}" yang terlihat di foto ini.`,
    'Untuk setiap objek, beri kotak pembatas (bounding box) yang pas mengelilingi objek tersebut.',
    'x dan y = titik TENGAH kotak, w dan h = lebar dan tinggi kotak.',
    'Semua nilai dinormalisasi 0..1 terhadap lebar dan tinggi foto, dihitung dari pojok kiri atas.',
    'Hanya hitung objek yang benar-benar jenis tersebut; jangan hitung pantulan atau objek lain yang mirip.',
    'Balas HANYA dengan JSON tanpa teks lain, format:',
    '{"count": <jumlah>, "points": [{"x": 0.12, "y": 0.34, "w": 0.08, "h": 0.05}], "note": "<catatan singkat, opsional>"}',
  ].join('\n')
}

// Models don't always honour "JSON only" — strip code fences and take the outermost object.
function parseModelJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(text.slice(start, end + 1))
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })

  try {
    const denied = await requireUser(req)
    if (denied) return res.status(denied.status).json({ error: denied.error })
  } catch (e) {
    return res.status(504).json({ error: `Gagal memverifikasi login: ${e instanceof Error ? e.message : String(e)}` })
  }

  if (!aiApiKey || !aiModel) {
    return res.status(503).json({
      error: 'AI belum dikonfigurasi. Isi AI_API_KEY, AI_MODEL, dan AI_BASE_URL di Vercel → Settings → Environment Variables, lalu Redeploy.',
    })
  }

  const body = (req.body ?? {}) as { image?: unknown; assetType?: unknown }
  const image = typeof body.image === 'string' ? body.image : ''
  const assetType = typeof body.assetType === 'string' ? body.assetType.trim().slice(0, 100) : ''
  if (!assetType) return res.status(400).json({ error: 'Pilih jenis aset dulu.' })
  if (!image.startsWith('data:image/') && !image.startsWith('https://')) {
    return res.status(400).json({ error: 'Foto tidak valid.' })
  }

  let content: string
  try {
    const response = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiApiKey}` },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildPrompt(assetType) },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    })
    const text = await response.text()
    if (!response.ok) {
      return res.status(502).json({ error: `AI error ${response.status}: ${text.slice(0, 300)}` })
    }
    const data = JSON.parse(text) as { choices?: { message?: { content?: string | null } }[] }
    content = data.choices?.[0]?.message?.content ?? ''
  } catch (e) {
    return res.status(504).json({ error: `Gagal menghubungi AI: ${e instanceof Error ? e.message : String(e)}` })
  }

  try {
    const parsed = parseModelJson(content) as { count?: unknown; points?: unknown; note?: unknown }
    const points = (Array.isArray(parsed.points) ? parsed.points : [])
      .filter(
        (p): p is { x: number; y: number } =>
          !!p && typeof (p as { x: unknown }).x === 'number' && typeof (p as { y: unknown }).y === 'number',
      )
      .slice(0, MAX_POINTS)
      .map((p) => {
        const { w, h } = p as { w?: unknown; h?: unknown }
        const box =
          typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0
            ? { w: clamp01(w), h: clamp01(h) }
            : {}
        return { x: clamp01(p.x), y: clamp01(p.y), ...box }
      })
    const reportedCount =
      typeof parsed.count === 'number' && Number.isFinite(parsed.count) ? Math.max(0, Math.round(parsed.count)) : 0
    return res.json({
      // Points are what the user sees and corrects, so they win when present.
      count: points.length > 0 ? points.length : reportedCount,
      points,
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 300) : '',
    })
  } catch {
    return res.status(502).json({ error: `Jawaban AI tidak bisa dibaca: ${content.slice(0, 200)}` })
  }
}
