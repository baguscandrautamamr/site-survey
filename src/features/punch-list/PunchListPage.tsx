import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePins } from '../plan-viewer/usePins'
import { STATUS_COLORS } from '../plan-viewer/usePins'
import PinFormModal from '../plan-viewer/PinFormModal'
import StatusFilterChips, { type StatusFilter } from './StatusFilterChips'
import { useTranslation } from '../../i18n/LanguageContext'
import type { PinStatus } from '../../types/models'

export default function PunchListPage() {
  const { projectId, planId } = useParams<{ projectId: string; planId: string }>()
  const { pins, updatePin, deletePin } = usePins(projectId, planId)
  const { t } = useTranslation()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: pins.length, open: 0, in_progress: 0, done: 0 }
    for (const pin of pins) c[pin.status]++
    return c
  }, [pins])

  const filtered = filter === 'all' ? pins : pins.filter((p) => p.status === filter)
  const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null

  const onDelete = (pinId: string) => {
    if (window.confirm(t('punchList.deleteConfirm'))) {
      deletePin(pinId)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link
          to={`/projects/${projectId}/plans/${planId}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"
          aria-label={t('punchList.backToPlan')}
        >
          &larr;
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('punchList.title')}</h1>
      </div>

      <div className="mb-4">
        <StatusFilterChips value={filter} onChange={setFilter} counts={counts} />
      </div>

      {filtered.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t('punchList.empty')}</p>}

      <ul className="space-y-2">
        {filtered.map((pin) => (
          <li key={pin.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSelectedPinId(pin.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              {pin.photoURL ? (
                <img src={pin.photoURL} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              ) : (
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: STATUS_COLORS[pin.status as PinStatus] }}
                >
                  <span className="text-xs font-semibold">{t(`status.${pin.status as PinStatus}`)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{pin.category}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{pin.notes || t('punchList.noNotes')}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{pin.createdByName}</p>
              </div>
            </button>
            <span
              className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: STATUS_COLORS[pin.status as PinStatus] }}
            >
              {t(`status.${pin.status as PinStatus}`)}
            </span>
            <button
              type="button"
              onClick={() => onDelete(pin.id)}
              aria-label={t('punchList.delete')}
              className="shrink-0 rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
            >
              &#128465;
            </button>
          </li>
        ))}
      </ul>

      {selectedPin && (
        <PinFormModal pin={selectedPin} onClose={() => setSelectedPinId(null)} onUpdate={updatePin} />
      )}
    </div>
  )
}
