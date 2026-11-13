import { useTranslation } from '../../i18n/LanguageContext'
import type { Measurement, MeasurementUnit } from '../../types/models'

interface Props {
  value: Measurement[]
  onChange: (next: Measurement[]) => void
  // Dipanggil saat nilainya layak disimpan (selesai mengetik, tambah/hapus baris)
  onCommit?: (next: Measurement[]) => void
}

const UNITS: MeasurementUnit[] = ['mm', 'cm', 'm']

// Baris yang benar-benar kosong tidak ikut disimpan
export function cleanMeasurements(list: Measurement[]): Measurement[] {
  return list
    .map((m) => ({ ...m, label: m.label.trim(), value: Number.isFinite(m.value) ? m.value : 0 }))
    .filter((m) => m.label || m.value)
}

export function formatMeasurements(list: Measurement[] | undefined): string {
  return (list ?? []).map((m) => `${m.label || '-'}: ${String(m.value).replace('.', ',')} ${m.unit}`).join('; ')
}

// Ukuran lapangan: daftar "nama + angka + satuan" (tinggi plafon, lebar bukaan, ...)
export default function MeasurementsEditor({ value, onChange, onCommit }: Props) {
  const { t } = useTranslation()
  const set = (i: number, patch: Partial<Measurement>, commit = false) => {
    const next = value.map((m, idx) => (idx === i ? { ...m, ...patch } : m))
    onChange(next)
    if (commit) onCommit?.(next)
  }
  const field =
    'rounded-lg border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white'

  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={m.label}
            onChange={(e) => set(i, { label: e.target.value })}
            onBlur={() => onCommit?.(value)}
            placeholder={t('measure.labelPlaceholder')}
            aria-label={t('measure.label')}
            className={`${field} min-w-0 flex-1`}
          />
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={Number.isFinite(m.value) && m.value !== 0 ? m.value : ''}
            onChange={(e) => set(i, { value: e.target.value === '' ? 0 : Number(e.target.value) })}
            onBlur={() => onCommit?.(value)}
            placeholder="0"
            aria-label={t('measure.value')}
            className={`${field} w-20 text-right`}
          />
          <select
            value={m.unit}
            onChange={(e) => set(i, { unit: e.target.value as MeasurementUnit }, true)}
            aria-label={t('measure.unit')}
            className={`${field} w-16 px-1`}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const next = value.filter((_, idx) => idx !== i)
              onChange(next)
              onCommit?.(next)
            }}
            aria-label={t('measure.remove')}
            className="shrink-0 px-1 text-xl leading-none text-slate-400 hover:text-red-500"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { label: '', value: 0, unit: value[value.length - 1]?.unit ?? 'cm' }])}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
      >
        {t('measure.add')}
      </button>
    </div>
  )
}
