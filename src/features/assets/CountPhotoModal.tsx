import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { countObjectsWithAI } from '../../lib/countObjects'
import { useTranslation } from '../../i18n/LanguageContext'
import type { CountPoint } from '../../types/models'

export interface CountResultDraft {
  points: CountPoint[]
  quantity: number
  usedAI: boolean
}

interface Props {
  imageSrc: string
  // Yang dikirim ke AI: Blob lokal atau URL foto yang sudah di-upload
  aiImage: Blob | string
  assetType: string
  initialPoints: CountPoint[]
  autoRunAI: boolean
  onCancel: () => void
  onDone: (result: CountResultDraft) => void
}

// Radius (px layar) untuk menganggap tap mengenai titik yang sudah ada
const HIT_RADIUS_PX = 18
// Gerakan lebih dari ini dianggap geser/zoom, bukan tap
const TAP_SLOP_PX = 6

export default function CountPhotoModal({
  imageSrc,
  aiImage,
  assetType,
  initialPoints,
  autoRunAI,
  onCancel,
  onDone,
}: Props) {
  const { t } = useTranslation()
  const [points, setPoints] = useState<CountPoint[]>(initialPoints)
  // AI kadang hanya memberi angka tanpa posisi; simpan angkanya selama belum ada titik
  const [aiCountOnly, setAiCountOnly] = useState<number | null>(null)
  const [usedAI, setUsedAI] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState('')
  const [scale, setScale] = useState(1)
  const imageRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const runAI = async () => {
    if (!assetType) {
      setAiError(t('count.needAssetType'))
      return
    }
    if (!navigator.onLine) {
      setAiError(t('count.offline'))
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await countObjectsWithAI(aiImage, assetType)
      setPoints(result.points)
      setAiCountOnly(result.points.length === 0 ? result.count : null)
      setAiNote(result.note)
      setUsedAI(true)
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (autoRunAI) runAI()
    // Hanya sekali saat modal dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return

    // Tap di dalam kotak (atau dekat titik manual) = hapus objek itu
    const hit = points.findIndex((p) =>
      p.w && p.h
        ? Math.abs(p.x - x) * rect.width <= (p.w * rect.width) / 2 + 4 &&
          Math.abs(p.y - y) * rect.height <= (p.h * rect.height) / 2 + 4
        : Math.hypot((p.x - x) * rect.width, (p.y - y) * rect.height) <= HIT_RADIUS_PX,
    )
    setAiCountOnly(null)
    if (hit >= 0) {
      setPoints(points.filter((_, i) => i !== hit))
    } else {
      setPoints([...points, { x, y }])
    }
  }

  const quantity = points.length > 0 ? points.length : (aiCountOnly ?? 0)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm text-white/70">{assetType || t('count.noAssetType')}</p>
          <p className="text-2xl font-bold">
            {quantity}
            {usedAI && (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 align-middle text-xs font-semibold text-slate-900">
                AI
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={runAI}
            disabled={aiLoading}
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {aiLoading ? t('count.aiRunning') : usedAI ? t('count.aiRerun') : t('count.aiRun')}
          </button>
          <button
            type="button"
            onClick={() => {
              setPoints([])
              setAiCountOnly(null)
            }}
            className="rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white"
          >
            {t('count.clear')}
          </button>
        </div>
      </div>

      {(aiError || aiNote || aiCountOnly !== null) && (
        <div className="space-y-1 px-4 pb-2 text-xs">
          {aiError && <p className="text-red-300">{aiError}</p>}
          {aiCountOnly !== null && <p className="text-amber-200">{t('count.aiNoPoints', { count: aiCountOnly })}</p>}
          {aiNote && <p className="text-white/70">AI: {aiNote}</p>}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <TransformWrapper
          doubleClick={{ disabled: true }}
          minScale={1}
          maxScale={8}
          onTransform={(_ref: unknown, state: { scale: number }) => setScale(state.scale)}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              ref={imageRef}
              onPointerDown={(e) => {
                pointerStart.current = { x: e.clientX, y: e.clientY }
              }}
              onClick={onImageClick}
              className="relative inline-block"
            >
              <img
                src={imageSrc}
                alt={t('count.photoAlt')}
                draggable={false}
                className="block max-h-[calc(100dvh-170px)] max-w-full select-none"
              />
              {points.map((p, i) =>
                p.w && p.h ? (
                  // Kotak berlabel ala Roboflow
                  <span
                    key={i}
                    className="pointer-events-none absolute border-2 border-violet-500"
                    style={{
                      left: `${(p.x - p.w / 2) * 100}%`,
                      top: `${(p.y - p.h / 2) * 100}%`,
                      width: `${p.w * 100}%`,
                      height: `${p.h * 100}%`,
                      borderWidth: `${2 / scale}px`,
                    }}
                  >
                    <span
                      className="absolute left-0 top-full whitespace-nowrap bg-violet-500 px-1 text-[10px] font-semibold uppercase leading-4 text-white"
                      style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top left' }}
                    >
                      {assetType || 'Objek'} {i + 1}
                    </span>
                  </span>
                ) : (
                <span
                  key={i}
                  className="pointer-events-none absolute flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 px-1 text-[11px] font-bold text-slate-900 shadow"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: `translate(-50%, -50%) scale(${1 / scale})`,
                  }}
                >
                  {i + 1}
                </span>
                ),
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
        {aiLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
            {t('count.aiRunning')}
          </div>
        )}
      </div>

      <p className="px-4 pt-2 text-center text-xs text-white/70">{t('count.tapHint')}</p>
      <div className="flex gap-2 p-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/30 py-3 text-sm font-medium text-white"
        >
          {t('count.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onDone({ points, quantity, usedAI })}
          className="flex-[2] rounded-xl bg-amber-400 py-3 text-sm font-semibold text-slate-900"
        >
          {t('count.use', { count: quantity })}
        </button>
      </div>
    </div>
  )
}
