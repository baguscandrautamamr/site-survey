import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePins } from '../plan-viewer/usePins'
import { STATUS_COLORS } from '../plan-viewer/usePins'
import PinFormModal from '../plan-viewer/PinFormModal'
import AssetFormModal from '../assets/AssetFormModal'
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

  // Rekap aset per jenis: total, baik, rusak, hilang
  const assetSummary = useMemo(() => {
    const byType = new Map<string, { quantity: number; damaged: number; missing: number }>()
    for (const pin of pins) {
      if (pin.kind !== 'asset') continue
      const key = pin.assetType || '-'
      const row = byType.get(key) ?? { quantity: 0, damaged: 0, missing: 0 }
      row.quantity += pin.quantity ?? 0
      row.damaged += pin.damaged ?? 0
      row.missing += pin.missing ?? 0
      byType.set(key, row)
    }
    return [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))
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

      {assetSummary.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">{t('assetSummary.type')}</th>
                <th className="px-2 py-2 text-right">{t('assetSummary.total')}</th>
                <th className="px-2 py-2 text-right">{t('assetForm.good')}</th>
                <th className="px-2 py-2 text-right">{t('assetForm.damaged')}</th>
                <th className="px-3 py-2 text-right">{t('assetForm.missing')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-900 dark:text-white">
              {assetSummary.map(([type, row]) => (
                <tr key={type} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{type}</td>
                  <td className="px-2 py-2 text-right font-semibold">{row.quantity}</td>
                  <td className="px-2 py-2 text-right text-green-600">
                    {Math.max(0, row.quantity - row.damaged - row.missing)}
                  </td>
                  <td className="px-2 py-2 text-right text-red-600">{row.damaged}</td>
                  <td className="px-3 py-2 text-right text-amber-600">{row.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              {pin.photoURL || pin.countPhotoURL ? (
                <img src={(pin.photoURL || pin.countPhotoURL)!} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              ) : (
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: STATUS_COLORS[pin.status as PinStatus] }}
                >
                  <span className="text-xs font-semibold">{t(`status.${pin.status as PinStatus}`)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {pin.kind === 'asset' ? `${pin.assetType || '-'} × ${pin.quantity ?? 0}` : pin.category}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {pin.kind === 'asset'
                    ? t('assetSummary.line', {
                        good: Math.max(0, (pin.quantity ?? 0) - (pin.damaged ?? 0) - (pin.missing ?? 0)),
                        damaged: pin.damaged ?? 0,
                        missing: pin.missing ?? 0,
                      })
                    : pin.notes || t('punchList.noNotes')}
                </p>
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
          <PinFormModal pin={selectedPin} onClose={() => setSelectedPinId(null)} onUpdate={updatePin} />
        )
      )}
    </div>
  )
}
