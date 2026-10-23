import type { Pin } from '../../types/models'
import { STATUS_COLORS } from './usePins'
import { useTranslation } from '../../i18n/LanguageContext'

interface Props {
  pin: Pin
  categoryColor: string
  zoomScale?: number
  onSelect: (pin: Pin) => void
}

export default function PinMarker({ pin, categoryColor, zoomScale = 1, onSelect }: Props) {
  const { t } = useTranslation()
  if (pin.kind === 'asset') {
    const hasIssue = (pin.damaged ?? 0) + (pin.missing ?? 0) > 0
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(pin)
        }}
        className="absolute flex h-7 min-w-7 items-center justify-center rounded-md border-[3px] bg-slate-900 px-1 text-xs font-bold text-white shadow-md"
        style={{
          left: `${pin.x * 100}%`,
          top: `${pin.y * 100}%`,
          borderColor: hasIssue ? STATUS_COLORS.open : STATUS_COLORS.done,
          transform: `translate(-50%, -50%) scale(${1 / zoomScale})`,
        }}
        aria-label={t('planViewer.assetLabel', { type: pin.assetType || '-', count: pin.quantity ?? 0 })}
      >
        {pin.quantity ?? 0}
        {(pin.localPhotoPending || pin.localCountPhotoPending) && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
        )}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(pin)
      }}
      className="absolute flex h-7 w-7 items-center justify-center rounded-full border-[3px] shadow-md"
      style={{
        left: `${pin.x * 100}%`,
        top: `${pin.y * 100}%`,
        backgroundColor: categoryColor,
        borderColor: STATUS_COLORS[pin.status],
        transform: `translate(-50%, -100%) scale(${1 / zoomScale})`,
        transformOrigin: 'center bottom',
      }}
      aria-label={t('planViewer.pinLabel', { category: pin.category, status: t(`status.${pin.status}`) })}
    >
      {pin.localPhotoPending && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
      )}
    </button>
  )
}
