import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import { ANNOTATION_COLORS, type PenVariant, type ShapeVariant, type Tool } from './annotations'

interface Props {
  tool: Tool
  penVariant: PenVariant
  shapeVariant: ShapeVariant
  color: string
  colorOpen: boolean
  canUndo: boolean
  calibrating: boolean
  calibrationLabel: string
  onToolChange: (tool: Tool) => void
  onPenVariantChange: (v: PenVariant) => void
  onShapeVariantChange: (v: ShapeVariant) => void
  onColorChange: (color: string) => void
  onColorOpenChange: (open: boolean) => void
  onCalibratingChange: (calibrating: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFullscreen: () => void
  onUndo: () => void
  onPrevPlan?: () => void
  onNextPlan?: () => void
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

interface ToolButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolButton({ label, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-md transition-colors ${
          active ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'
        } ${disabled ? 'opacity-40' : ''}`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-11 top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg md:group-hover:block">
        {label}
      </span>
    </div>
  )
}

function SubBar({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-11 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-slate-900 p-1 shadow-lg">
      {children}
    </div>
  )
}

function SubButton({ active, label, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${
        active ? 'bg-blue-600 text-white' : 'text-white hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export default function ToolSidebar(props: Props) {
  const { t } = useTranslation()
  const {
    tool,
    penVariant,
    shapeVariant,
    color,
    colorOpen,
    canUndo,
    calibrating,
    calibrationLabel,
    onToolChange,
    onPenVariantChange,
    onShapeVariantChange,
    onColorChange,
    onColorOpenChange,
    onCalibratingChange,
    onZoomIn,
    onZoomOut,
    onFullscreen,
    onUndo,
    onPrevPlan,
    onNextPlan,
  } = props

  // Klik alat yang sedang aktif = matikan alat itu (kembali ke mode pilih)
  const pickTool = (next: Tool) => {
    onColorOpenChange(false)
    onToolChange(next === tool ? 'select' : next)
  }

  return (
    <div className="pointer-events-none absolute inset-y-2 left-2 z-20 flex flex-col flex-wrap content-start justify-center gap-1 [&>*]:pointer-events-auto">
      <ToolButton label={t('planViewer.tool.fullscreen')} onClick={onFullscreen}>
        <Icon>
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </Icon>
      </ToolButton>

      <ToolButton label={t('planViewer.tool.zoomIn')} onClick={onZoomIn}>
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
      </ToolButton>

      <ToolButton label={t('planViewer.tool.zoomOut')} onClick={onZoomOut}>
        <Icon>
          <path d="M5 12h14" />
        </Icon>
      </ToolButton>

      <ToolButton
        label={t('planViewer.tool.addTask')}
        active={tool === 'pin'}
        onClick={() => pickTool('pin')}
      >
        <Icon>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </Icon>
      </ToolButton>

      <ToolButton
        label={t('planViewer.tool.addAsset')}
        active={tool === 'asset'}
        onClick={() => pickTool('asset')}
      >
        <Icon>
          <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </Icon>
      </ToolButton>

      <div className="relative">
        <ToolButton
          label={t('planViewer.tool.pen')}
          active={tool === 'pen'}
          onClick={() => pickTool('pen')}
        >
          <Icon>
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </Icon>
        </ToolButton>
        {tool === 'pen' && (
          <SubBar>
            <SubButton
              label={t('planViewer.pen.freehand')}
              active={penVariant === 'freehand'}
              onClick={() => onPenVariantChange('freehand')}
            >
              <Icon>
                <path d="M4 17c2-6 4-6 6-2s4 4 6-2 4-4 4-4" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.pen.line')}
              active={penVariant === 'line'}
              onClick={() => onPenVariantChange('line')}
            >
              <Icon>
                <path d="M5 19L19 5" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.pen.arrow')}
              active={penVariant === 'arrow'}
              onClick={() => onPenVariantChange('arrow')}
            >
              <Icon>
                <path d="M19 5L5 19M5 19v-7M5 19h7" />
              </Icon>
            </SubButton>
          </SubBar>
        )}
      </div>

      <div className="relative">
        <ToolButton
          label={t('planViewer.tool.shape')}
          active={tool === 'shape'}
          onClick={() => pickTool('shape')}
        >
          <Icon>
            <path d="M6.5 9a4 4 0 0 1 7.6-1.5A3.5 3.5 0 1 1 16 14.5H7A3.5 3.5 0 0 1 6.5 9Z" />
            <rect x="9" y="15" width="10" height="6" rx="1" />
          </Icon>
        </ToolButton>
        {tool === 'shape' && (
          <SubBar>
            <SubButton
              label={t('planViewer.shape.cloud')}
              active={shapeVariant === 'cloud'}
              onClick={() => onShapeVariantChange('cloud')}
            >
              <Icon>
                <path d="M6.5 11a4 4 0 0 1 7.6-1.5A3.5 3.5 0 1 1 16 16.5H7A3.5 3.5 0 0 1 6.5 11Z" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.rect')}
              active={shapeVariant === 'rect'}
              onClick={() => onShapeVariantChange('rect')}
            >
              <Icon>
                <rect x="4" y="5" width="16" height="14" rx="1" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.ellipse')}
              active={shapeVariant === 'ellipse'}
              onClick={() => onShapeVariantChange('ellipse')}
            >
              <Icon>
                <circle cx="12" cy="12" r="8" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.triangle')}
              active={shapeVariant === 'triangle'}
              onClick={() => onShapeVariantChange('triangle')}
            >
              <Icon>
                <path d="M12 4L21 20H3L12 4Z" />
              </Icon>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.rectFilled')}
              active={shapeVariant === 'rectFilled'}
              onClick={() => onShapeVariantChange('rectFilled')}
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                <rect x="4" y="5" width="16" height="14" rx="1" />
              </svg>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.ellipseFilled')}
              active={shapeVariant === 'ellipseFilled'}
              onClick={() => onShapeVariantChange('ellipseFilled')}
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </SubButton>
            <SubButton
              label={t('planViewer.shape.triangleFilled')}
              active={shapeVariant === 'triangleFilled'}
              onClick={() => onShapeVariantChange('triangleFilled')}
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                <path d="M12 4L21 20H3L12 4Z" />
              </svg>
            </SubButton>
          </SubBar>
        )}
      </div>

      <ToolButton
        label={t('planViewer.tool.text')}
        active={tool === 'text'}
        onClick={() => pickTool('text')}
      >
        <span className="text-base font-semibold lowercase">a</span>
      </ToolButton>

      <div className="relative">
        <ToolButton
          label={t('planViewer.tool.measure')}
          active={tool === 'measure'}
          onClick={() => pickTool('measure')}
        >
          <Icon>
            <path d="M3 17L17 3l4 4L7 21l-4-4z" />
            <path d="M8 12l2 2M11 9l2 2M14 6l2 2" />
          </Icon>
        </ToolButton>
        {tool === 'measure' && (
          <SubBar>
            <button
              type="button"
              onClick={() => onCalibratingChange(!calibrating)}
              aria-pressed={calibrating}
              className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium ${
                calibrating ? 'bg-blue-600 text-white' : 'text-white hover:bg-slate-700'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
              {t('planViewer.calibrate')}
            </button>
            <span className="whitespace-nowrap px-2 text-xs text-slate-300">{calibrationLabel}</span>
          </SubBar>
        )}
      </div>

      <div className="relative">
        <ToolButton
          label={t('planViewer.tool.color')}
          active={colorOpen}
          onClick={() => onColorOpenChange(!colorOpen)}
        >
          <span
            className="h-4 w-4 rounded-full border border-white/60"
            style={{ backgroundColor: color }}
          />
        </ToolButton>
        {colorOpen && (
          <SubBar>
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => {
                  onColorChange(c)
                  onColorOpenChange(false)
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                  c === color ? 'bg-slate-600' : 'hover:bg-slate-700'
                }`}
              >
                <span
                  className="h-4.5 w-4.5 rounded-full border border-white/60"
                  style={{ backgroundColor: c }}
                />
              </button>
            ))}
          </SubBar>
        )}
      </div>

      <ToolButton
        label={t('planViewer.tool.select')}
        active={tool === 'select'}
        onClick={() => pickTool('select')}
      >
        <Icon>
          <path d="M5 3l14 9-6.5 1.5L9 20 5 3z" />
        </Icon>
      </ToolButton>

      <ToolButton label={t('planViewer.tool.undo')} disabled={!canUndo} onClick={onUndo}>
        <Icon>
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </Icon>
      </ToolButton>

      {(onPrevPlan || onNextPlan) && (
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            aria-label={t('planViewer.tool.prevPlan')}
            disabled={!onPrevPlan}
            onClick={onPrevPlan}
            className="flex h-8 w-[17px] flex-1 items-center justify-center rounded-l-lg bg-slate-900 text-white shadow-md hover:bg-slate-700 disabled:opacity-40"
          >
            <Icon>
              <path d="M15 18l-6-6 6-6" />
            </Icon>
          </button>
          <button
            type="button"
            aria-label={t('planViewer.tool.nextPlan')}
            disabled={!onNextPlan}
            onClick={onNextPlan}
            className="flex h-8 w-[17px] flex-1 items-center justify-center rounded-r-lg bg-slate-900 text-white shadow-md hover:bg-slate-700 disabled:opacity-40"
          >
            <Icon>
              <path d="M9 6l6 6-6 6" />
            </Icon>
          </button>
        </div>
      )}
    </div>
  )
}
