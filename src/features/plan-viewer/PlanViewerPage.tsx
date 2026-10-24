import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { clientPointToNormalized } from './coordinateMath'
import { usePins } from './usePins'
import PinMarker from './PinMarker'
import PinFormModal from './PinFormModal'
import AssetFormModal from '../assets/AssetFormModal'
import ToolSidebar from './ToolSidebar'
import AnnotationLayer from './AnnotationLayer'
import TextBoxModal from './TextBoxModal'
import CalibrationModal from './CalibrationModal'
import {
  useAnnotations,
  useCalibration,
  newAnnotationId,
  type PenVariant,
  type ShapeVariant,
  type Tool,
} from './annotations'
import { usePlans } from '../plans/usePlans'
import { colorForCategory, useCategories } from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Plan } from '../../types/models'

const DRAWING_TOOLS: Tool[] = ['pen', 'shape', 'text', 'measure']

export default function PlanViewerPage() {
  const { projectId, planId } = useParams<{ projectId: string; planId: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const { pins, createPin, updatePin, deletePin } = usePins(projectId, planId)
  const { plans } = usePlans(projectId)
  const { categories } = useCategories()
  const { t } = useTranslation()
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null)

  // Alat gambar ala Fieldwire
  const [tool, setTool] = useState<Tool>('select')
  const [penVariant, setPenVariant] = useState<PenVariant>('freehand')
  const [shapeVariant, setShapeVariant] = useState<ShapeVariant>('cloud')
  const [color, setColor] = useState('#dc2626')
  const [colorOpen, setColorOpen] = useState(false)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [textRect, setTextRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [calibrating, setCalibrating] = useState(false)
  const [pendingCalibrationPx, setPendingCalibrationPx] = useState<number | null>(null)
  const { annotations, addAnnotation, removeAnnotation, undo } = useAnnotations(projectId, planId)
  const { calibration, setCalibration } = useCalibration(projectId, planId)

  const isDrawingTool = DRAWING_TOOLS.includes(tool)

  useEffect(() => {
    if (!projectId || !planId) return
    return onSnapshot(doc(db, 'projects', projectId, 'plans', planId), (snap) => {
      if (snap.exists()) setPlan({ id: snap.id, ...(snap.data() as Omit<Plan, 'id'>) })
    })
  }, [projectId, planId])

  // Navigasi denah sebelumnya / berikutnya
  const { prevPlanId, nextPlanId } = useMemo(() => {
    const idx = plans.findIndex((p) => p.id === planId)
    return {
      prevPlanId: idx > 0 ? plans[idx - 1].id : null,
      nextPlanId: idx >= 0 && idx < plans.length - 1 ? plans[idx + 1].id : null,
    }
  }, [plans, planId])

  // Pintasan keyboard: Shift+T = tambah temuan, T = kotak teks, Esc = pilih, Ctrl+Z = urungkan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key === 'Escape') {
        setTool('select')
        setColorOpen(false)
        setSelectedAnnotationId(null)
      } else if ((e.key === 't' || e.key === 'T') && e.shiftKey) {
        e.preventDefault()
        setTool('pin')
      } else if (e.key === 't') {
        e.preventDefault()
        setTool('text')
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])

  const onContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'pin' && tool !== 'asset') {
      // Pin hanya bisa ditambahkan saat alat "Tambah temuan" / "Tambah aset" aktif
      setSelectedAnnotationId(null)
      return
    }
    if (!containerRef.current || dropping) return
    const rect = containerRef.current.getBoundingClientRect()
    const { x, y } = clientPointToNormalized(e.clientX, e.clientY, rect)
    setDropping(true)
    try {
      const pinId = await createPin(x, y, tool === 'asset' ? 'asset' : 'finding')
      setSelectedPinId(pinId)
    } finally {
      setDropping(false)
    }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      viewerRef.current?.requestFullscreen?.()
    }
  }

  const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null

  if (!plan) {
    return <div className="p-6 text-sm text-slate-500">{t('planViewer.loading')}</div>
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/projects/${projectId}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"
            aria-label={t('planViewer.backToPlans')}
          >
            &larr;
          </Link>
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white">{plan.name}</h1>
        </div>
        <Link
          to={`/projects/${projectId}/plans/${planId}/punchlist`}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
        >
          {t('planViewer.punchList', { count: pins.length })}
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto border-b border-slate-200 px-4 py-1.5 dark:border-slate-700">
        {categories.map((c) => (
          <span key={c.id} className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </span>
        ))}
      </div>

      <div ref={viewerRef} className="relative flex-1 overflow-hidden bg-slate-100">
        <ToolSidebar
          tool={tool}
          penVariant={penVariant}
          shapeVariant={shapeVariant}
          color={color}
          colorOpen={colorOpen}
          canUndo={annotations.length > 0}
          calibrating={calibrating}
          calibrationLabel={
            calibration
              ? t('planViewer.calibratedAs', {
                  pixels: Math.round(calibration.pixels),
                  meters: String(calibration.meters).replace('.', ','),
                })
              : t('planViewer.notCalibrated')
          }
          onCalibratingChange={setCalibrating}
          onToolChange={(next) => {
            setTool(next)
            setSelectedAnnotationId(null)
            if (next !== 'measure') setCalibrating(false)
          }}
          onPenVariantChange={setPenVariant}
          onShapeVariantChange={setShapeVariant}
          onColorChange={setColor}
          onColorOpenChange={setColorOpen}
          onZoomIn={() => transformRef.current?.zoomIn()}
          onZoomOut={() => transformRef.current?.zoomOut()}
          onFullscreen={toggleFullscreen}
          onUndo={() => {
            undo()
            setSelectedAnnotationId(null)
          }}
          onPrevPlan={
            prevPlanId ? () => navigate(`/projects/${projectId}/plans/${prevPlanId}`) : undefined
          }
          onNextPlan={
            nextPlanId ? () => navigate(`/projects/${projectId}/plans/${nextPlanId}`) : undefined
          }
        />

        <TransformWrapper
          ref={transformRef}
          doubleClick={{ disabled: true }}
          minScale={0.5}
          maxScale={6}
          panning={{ disabled: isDrawingTool }}
          onTransform={(_ref: unknown, state: { scale: number }) => setZoomScale(state.scale)}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%' }}>
            <div ref={containerRef} onClick={onContainerClick} className="relative w-full">
              <img src={plan.imageURL} alt={plan.name} draggable={false} className="block w-full select-none" />
              <AnnotationLayer
                annotations={annotations}
                tool={tool}
                penVariant={penVariant}
                shapeVariant={shapeVariant}
                color={color}
                imageWidth={plan.imageWidth || 1600}
                imageHeight={plan.imageHeight || 1200}
                selectedId={selectedAnnotationId}
                calibration={calibration}
                calibrating={calibrating}
                onSelect={setSelectedAnnotationId}
                onAdd={addAnnotation}
                onDelete={removeAnnotation}
                onTextRect={setTextRect}
                onCalibrate={setPendingCalibrationPx}
              />
              {pins.map((pin) => (
                <PinMarker
                  key={pin.id}
                  pin={pin}
                  categoryColor={colorForCategory(categories, pin.category)}
                  zoomScale={zoomScale}
                  onSelect={(p) => setSelectedPinId(p.id)}
                />
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>

        <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
          {tool === 'measure' && calibrating
            ? t('planViewer.calibrateHint')
            : tool === 'pin'
              ? t('planViewer.tapHint')
              : tool === 'asset'
                ? t('planViewer.assetTapHint')
              : tool === 'text'
                ? t('planViewer.textDrawHint')
                : isDrawingTool
                  ? t('planViewer.drawHint')
                  : t('planViewer.toolHint')}
        </p>
      </div>

      {textRect && (
        <TextBoxModal
          onClose={() => setTextRect(null)}
          onSave={(text, fontSize) => {
            addAnnotation({
              id: newAnnotationId(),
              color,
              createdAt: Date.now(),
              kind: 'text',
              ...textRect,
              text,
              fontSize,
            })
            setTextRect(null)
          }}
        />
      )}

      {pendingCalibrationPx !== null && (
        <CalibrationModal
          pixels={pendingCalibrationPx}
          onClose={() => setPendingCalibrationPx(null)}
          onSave={(meters) => {
            setCalibration({ pixels: pendingCalibrationPx, meters })
            setPendingCalibrationPx(null)
            setCalibrating(false)
          }}
        />
      )}

      {selectedPin?.kind === 'asset' ? (
        <AssetFormModal
          key={selectedPin.id}
          pin={selectedPin}
          onClose={() => setSelectedPinId(null)}
          onUpdate={updatePin}
          onDelete={deletePin}
        />
      ) : (
        selectedPin && (
          <PinFormModal
            pin={selectedPin}
            onClose={() => setSelectedPinId(null)}
            onUpdate={updatePin}
            onDelete={deletePin}
          />
        )
      )}
    </div>
  )
}
