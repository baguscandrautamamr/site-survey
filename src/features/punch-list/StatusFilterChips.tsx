import type { PinStatus } from '../../types/models'
import { useTranslation } from '../../i18n/LanguageContext'

export type StatusFilter = 'all' | PinStatus

interface Props {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
  counts: Record<StatusFilter, number>
}

const OPTIONS: StatusFilter[] = ['all', 'open', 'in_progress', 'done']

export default function StatusFilterChips({ value, onChange, counts }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
            value === opt
              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
              : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-400'
          }`}
        >
          {opt === 'all' ? t('status.all') : t(`status.${opt}`)} ({counts[opt]})
        </button>
      ))}
    </div>
  )
}
