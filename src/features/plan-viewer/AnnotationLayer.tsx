import { useRef, useState } from 'react'
import {
  formatDistance,
  newAnnotationId,
  type Annotation,
  type Calibration,
  type PenVariant,
  type Point,
  type ShapeAnnotation,
  type ShapeVariant,
  type Tool,
} from './annotations'

interface Props {
  annotations: Annotation[]
  tool: Tool
  penVariant: PenVariant
  shapeVariant: ShapeVariant
  color: string
  imageWidth: number
  imageHeight: number
  selectedId: string | null
  calibration: Calibration | null
  calibrating: boolean
  onSelect: (id: string | null) => void
  onAdd: (a: Annotation) => void
  onDelete: (id: string) => void
  onMove: (id: string, data: Partial<Annotation>) => void
  onTextRect: (rect: { x: number; y: number; w: number; h: number }) => void
  onCalibrate: (pixels: number) => void
}

const DRAWING_TOOLS: Tool[] = ['pen', 'shape', 'text', 'measure']

interface Draft {
  start: Point
  current: Point
  points: Point[]
}

function shapeKindOf(variant: ShapeVariant): { kind: ShapeAnnotation['kind']; filled: boolean } {
  switch (variant) {
    case 'cloud':
      return { kind: 'cloud', filled: false }
    case 'rect':
      return { kind: 'rect', filled: false }
    case 'ellipse':
      return { kind: 'ellipse', filled: false }
    case 'triangle':
      return { kind: 'triangle', filled: false }
    case 'rectFilled':
      return { kind: 'rect', filled: true }
    case 'ellipseFilled':
      return { kind: 'ellipse', filled: true }
    case 'triangleFilled':
      return { kind: 'triangle', filled: true }
  }
}

// Awan revisi: busur-busur kecil menggembung keluar di sepanjang keliling kotak.
function cloudPath(x: number, y: number, w: number, h: number): string {
  const r = Math.max(Math.min(w, h) / 8, Math.min(w, h) / 2 > 4 ? 4 : Math.min(w, h) / 2)
  if (!isFinite(r) || r <= 0) return ''
  const seg = (len: number) => Math.max(1, Math.round(len / (2 * r)))
  let d = `M ${x} ${y}`
  const edges: Array<[number, number]> = [
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x, y],
  ]
  let cx = x
  let cy = y
  for (const [ex, ey] of edges) {
    const len = Math.hypot(ex - cx, ey - cy)
    const n = seg(len)
    const dx = (ex - cx) / n
    const dy = (ey - cy) / n
    const radius = Math.hypot(dx, dy) / 2
    for (let i = 0; i < n; i++) {
      cx += dx
      cy += dy
      d += ` A ${radius} ${radius} 0 0 1 ${cx} ${cy}`
    }
  }
  return d + ' Z'
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const a1 = angle + Math.PI - Math.PI / 7
  const a2 = angle + Math.PI + Math.PI / 7
  const p1x = x2 + size * Math.cos(a1)
  const p1y = y2 + size * Math.sin(a1)
  const p2x = x2 + size * Math.cos(a2)
  const p2y = y2 + size * Math.sin(a2)
  return `M ${p1x} ${p1y} L ${x2} ${y2} L ${p2x} ${p2y}`
}

// Menggeser anotasi sejauh dx, dy (koordinat ternormalisasi 0..1)
function translated(a: Annotation, dx: number, dy: number): Partial<Annotation> {
  if (a.kind === 'freehand') return { points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
  if ('x1' in a) {
    return { x1: a.x1 + dx, y1: a.y1 + dy, x2: a.x2 + dx, y2: a.y2 + dy }
  }
  return { x: a.x + dx, y: a.y + dy }
}

function annotationBBox(a: Annotation): { x: number; y: number; w: number; h: number } {
  if (a.kind === 'freehand') {
    const xs = a.points.map((p) => p.x)
    const ys = a.points.map((p) => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
  }
  if (a.kind === 'line' || a.kind === 'arrow' || a.kind === 'measure') {
    const minX = Math.min(a.x1, a.x2)
    const minY = Math.min(a.y1, a.y2)
    return { x: minX, y: minY, w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1) }
  }
  if (
    a.kind === 'text' ||
    a.kind === 'cloud' ||
    a.kind === 'rect' ||
    a.kind === 'ellipse' ||
    a.kind === 'triangle'
  ) {
    return { x: a.x, y: a.y, w: a.w, h: a.h }
  }
  return { x: 0, y: 0, w: 0, h: 0 }
}

export default function AnnotationLayer({
  annotations,
  tool,
  penVariant,
  shapeVariant,
  color,
  imageWidth,
  imageHeight,
  selectedId,
  calibration,
  calibrating,
  onSelect,
  onAdd,
  onDelete,
  onMove,
  onTextRect,
  onCalibrate,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const dragRef = useRef<{ id: string; start: Point; orig: Annotation; moved: boolean } | null>(null)
  const W = imageWidth
  const H = imageHeight
  const isDrawing = DRAWING_TOOLS.includes(tool)
  const strokeW = Math.max(W, H) / 500
  const fontScale = W / 1000

  const toNorm = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isDrawing || e.button !== 0) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = toNorm(e)
    setDraft({ start: p, current: p, points: [p] })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draft) return
    const p = toNorm(e)
    setDraft((d) => (d ? { ...d, current: p, points: [...d.points, p] } : d))
  }

  const onPointerUp = () => {
    if (!draft) return
    const { start, current, points } = draft
    setDraft(null)
    const dist = Math.hypot(current.x - start.x, current.y - start.y)
    const base = { id: newAnnotationId(), color, createdAt: Date.now() }

    if (tool === 'text') {
      // Klik singkat = kotak ukuran default, seret = ukuran sesuai seretan
      const rect =
        dist < 0.01
          ? { x: start.x, y: start.y, w: 0.25, h: 0.08 }
          : {
              x: Math.min(start.x, current.x),
              y: Math.min(start.y, current.y),
              w: Math.max(Math.abs(current.x - start.x), 0.05),
              h: Math.max(Math.abs(current.y - start.y), 0.04),
            }
      onTextRect(rect)
      return
    }

    if (dist < 0.003 && !(tool === 'pen' && penVariant === 'freehand' && points.length > 5)) return

    if (tool === 'pen') {
      if (penVariant === 'freehand') {
        onAdd({ ...base, kind: 'freehand', points })
      } else {
        onAdd({
          ...base,
          kind: penVariant === 'arrow' ? 'arrow' : 'line',
          x1: start.x,
          y1: start.y,
          x2: current.x,
          y2: current.y,
        })
      }
      return
    }

    if (tool === 'measure') {
      if (calibrating) {
        const px = Math.hypot((current.x - start.x) * W, (current.y - start.y) * H)
        onCalibrate(px)
        return
      }
      onAdd({ ...base, kind: 'measure', x1: start.x, y1: start.y, x2: current.x, y2: current.y })
      return
    }

    if (tool === 'shape') {
      const { kind, filled } = shapeKindOf(shapeVariant)
      onAdd({
        ...base,
        kind,
        filled,
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        w: Math.abs(current.x - start.x),
        h: Math.abs(current.y - start.y),
      })
    }
  }

  // Mode pilih: seret anotasi untuk memindahkannya
  const startDrag = (e: React.PointerEvent, a: Annotation) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(a.id)
    dragRef.current = { id: a.id, start: toNorm(e), orig: a, moved: false }
    const onMoveEvt = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const p = toNorm(ev)
      d.moved = true
      onMove(d.id, translated(d.orig, p.x - d.start.x, p.y - d.start.y))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMoveEvt)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMoveEvt)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const renderShape = (a: Annotation, isDraft = false) => {
    const common = {
      stroke: a.color,
      strokeWidth: strokeW,
      vectorEffect: 'non-scaling-stroke' as const,
      opacity: isDraft ? 0.7 : 1,
      style:
        tool === 'select' && !isDraft
          ? ({ cursor: 'move', pointerEvents: 'visiblePainted', touchAction: 'none' } as React.CSSProperties)
          : ({ pointerEvents: 'none' } as React.CSSProperties),
      onClick:
        tool === 'select' && !isDraft
          ? (e: React.MouseEvent) => {
              e.stopPropagation()
              onSelect(a.id)
            }
          : undefined,
      onPointerDown: tool === 'select' && !isDraft ? (e: React.PointerEvent) => startDrag(e, a) : undefined,
      className: 'annotation-draggable',
    }

    if (a.kind === 'freehand') {
      const d = a.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * W} ${p.y * H}`)
        .join(' ')
      return <path key={a.id} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round" {...common} />
    }

    if (a.kind === 'line' || a.kind === 'arrow' || a.kind === 'measure') {
      const x1 = a.x1 * W
      const y1 = a.y1 * H
      const x2 = a.x2 * W
      const y2 = a.y2 * H
      const headSize = Math.max(W, H) / 60
      const distLabel = formatDistance(Math.hypot(x2 - x1, y2 - y1), calibration)
      return (
        <g key={a.id} {...common} fill="none">
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          {a.kind === 'arrow' && <path d={arrowHead(x1, y1, x2, y2, headSize)} />}
          {a.kind === 'measure' && (
            <>
              <path d={arrowHead(x1, y1, x2, y2, headSize * 0.7)} />
              <path d={arrowHead(x2, y2, x1, y1, headSize * 0.7)} />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 8 * fontScale}
                fill={a.color}
                stroke="none"
                textAnchor="middle"
                fontSize={13 * fontScale}
                fontWeight={600}
                paintOrder="stroke"
                style={{ pointerEvents: 'none' }}
              >
                {distLabel}
              </text>
            </>
          )}
        </g>
      )
    }

    if (a.kind === 'text') {
      return (
        <foreignObject
          key={a.id}
          x={a.x * W}
          y={a.y * H}
          width={a.w * W}
          height={a.h * H}
          style={common.style}
          onClick={common.onClick}
          onPointerDown={common.onPointerDown}
          className={common.className}
        >
          <div
            className="annotation-draggable"
            style={{
              width: '100%',
              height: '100%',
              color: a.color,
              fontSize: `${a.fontSize * fontScale}px`,
              lineHeight: 1.25,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontWeight: 600,
            }}
          >
            {a.text}
          </div>
        </foreignObject>
      )
    }

    if (a.kind === 'rect' || a.kind === 'ellipse' || a.kind === 'triangle' || a.kind === 'cloud') {
      const x = a.x * W
      const y = a.y * H
      const w = a.w * W
      const h = a.h * H
      const fill = a.filled ? a.color : 'none'
      const fillOpacity = a.filled ? 0.45 : undefined

      if (a.kind === 'rect') {
        return <rect key={a.id} x={x} y={y} width={w} height={h} fill={fill} fillOpacity={fillOpacity} {...common} />
      }
      if (a.kind === 'ellipse') {
        return (
          <ellipse
            key={a.id}
            cx={x + w / 2}
            cy={y + h / 2}
            rx={w / 2}
            ry={h / 2}
            fill={fill}
            fillOpacity={fillOpacity}
            {...common}
          />
        )
      }
      if (a.kind === 'triangle') {
        return (
          <polygon
            key={a.id}
            points={`${x + w / 2},${y} ${x},${y + h} ${x + w},${y + h}`}
            fill={fill}
            fillOpacity={fillOpacity}
            strokeLinejoin="round"
            {...common}
          />
        )
      }
      return <path key={a.id} d={cloudPath(x, y, w, h)} fill="none" {...common} />
    }
    return null
  }

  const renderDraft = () => {
    if (!draft) return null
    const { start, current, points } = draft
    const base = { id: 'draft', color, createdAt: 0 }
    let a: Annotation | null = null
    if (tool === 'pen' && penVariant === 'freehand') {
      a = { ...base, kind: 'freehand', points }
    } else if (tool === 'pen') {
      a = {
        ...base,
        kind: penVariant === 'arrow' ? 'arrow' : 'line',
        x1: start.x,
        y1: start.y,
        x2: current.x,
        y2: current.y,
      }
    } else if (tool === 'measure') {
      a = { ...base, kind: 'measure', x1: start.x, y1: start.y, x2: current.x, y2: current.y }
    } else if (tool === 'shape') {
      const { kind, filled } = shapeKindOf(shapeVariant)
      a = {
        ...base,
        kind,
        filled,
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        w: Math.abs(current.x - start.x),
        h: Math.abs(current.y - start.y),
      }
    } else if (tool === 'text') {
      a = {
        ...base,
        kind: 'rect',
        filled: false,
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        w: Math.abs(current.x - start.x),
        h: Math.abs(current.y - start.y),
      }
    }
    return a ? renderShape(a, true) : null
  }

  const selected = annotations.find((a) => a.id === selectedId)
  const selectedBox = selected ? annotationBBox(selected) : null

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{
          pointerEvents: isDrawing ? 'auto' : 'none',
          cursor: isDrawing ? 'crosshair' : undefined,
          touchAction: isDrawing ? 'none' : undefined,
          zIndex: 5,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDraft(null)}
      >
        {annotations.map((a) => renderShape(a))}
        {renderDraft()}
        {selected && selectedBox && (
          <rect
            x={selectedBox.x * W - strokeW * 2}
            y={selectedBox.y * H - strokeW * 2}
            width={selectedBox.w * W + strokeW * 4}
            height={selectedBox.h * H + strokeW * 4}
            fill="none"
            stroke="#2563eb"
            strokeWidth={strokeW}
            strokeDasharray={`${strokeW * 3} ${strokeW * 2}`}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {selected && selectedBox && tool === 'select' && (
        <button
          type="button"
          aria-label="Delete annotation"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(selected.id)
            onSelect(null)
          }}
          className="absolute z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-md"
          style={{
            left: `${(selectedBox.x + selectedBox.w) * 100}%`,
            top: `${selectedBox.y * 100}%`,
          }}
        >
          &times;
        </button>
      )}
    </>
  )
}
