import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

interface Props {
  blob: Blob
  onDone: (blob: Blob) => void
  onCancel: () => void
}

interface Stroke {
  color: string
  points: { x: number; y: number }[]
}

const COLORS = ['#dc2626', '#facc15', '#2563eb', '#ffffff']

// Coret di atas foto sebelum disimpan (melingkari, memberi panah, dsb.).
// Coretan digambar langsung ke piksel foto, jadi ikut tampil di laporan dan Excel.
export default function PhotoMarkupModal({ blob, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState(COLORS[0])
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const drawing = useRef<Stroke | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
      }
      setReady(true)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const redraw = (all: Stroke[]) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !img || !ctx) return
    ctx.drawImage(img, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(4, Math.max(canvas.width, canvas.height) / 180)
    for (const s of all) {
      if (!s.points.length) continue
      ctx.strokeStyle = s.color
      ctx.beginPath()
      ctx.moveTo(s.points[0].x, s.points[0].y)
      // Satu titik saja = ketukan; gambar titik kecil
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y)
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    if (ready) redraw(strokes)
  }, [ready, strokes])

  const toCanvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = { color, points: [toCanvasPoint(e)] }
    redraw([...strokes, drawing.current])
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    drawing.current.points.push(toCanvasPoint(e))
    redraw([...strokes, drawing.current])
  }
  const onPointerUp = () => {
    if (!drawing.current) return
    const done = drawing.current
    drawing.current = null
    setStrokes((prev) => [...prev, done])
  }

  const onSave = () => {
    // Tanpa coretan, pakai foto asli supaya tidak dikompres ulang
    if (strokes.length === 0) return onDone(blob)
    setSaving(true)
    canvasRef.current?.toBlob((out) => onDone(out ?? blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          {t('photoMarkup.cancel')}
        </button>
        <p className="truncate text-xs text-slate-300">{t('photoMarkup.hint')}</p>
        <button
          type="button"
          onClick={onSave}
          disabled={!ready || saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t('photoMarkup.use')}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={t('photoMarkup.canvas')}
          className="max-h-full max-w-full touch-none"
        />
      </div>

      <div className="flex items-center justify-center gap-3 px-3 py-3">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={c}
            aria-pressed={color === c}
            className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-white ring-2 ring-blue-400' : 'border-slate-500'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          onClick={() => setStrokes((prev) => prev.slice(0, -1))}
          disabled={strokes.length === 0}
          className="ml-2 rounded-lg border border-slate-500 px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          {t('photoMarkup.undo')}
        </button>
      </div>
    </div>
  )
}
