import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import { useTranslation } from '../../i18n/LanguageContext'
import { compareFloors } from '../plans/floors'
import { toMs } from '../tasks/useProjectPins'
import { STATUS_COLORS } from '../plan-viewer/usePins'
import { formatMeasurements } from '../pins/MeasurementsEditor'
import type { Pin, Plan } from '../../types/models'

interface PlanSection {
  plan: Plan
  pins: Pin[]
}

// Versi lebih kecil dari foto Cloudinary supaya PDF tidak terlalu berat
function sized(url: string, width: number) {
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/w_${width},c_limit,q_auto/`)
    : url
}

function pinPhotos(pin: Pin): string[] {
  return [pin.photoURL, pin.countPhotoURL, ...(pin.extraPhotos ?? []).map((p) => p.url)].filter(
    (u): u is string => !!u,
  )
}

// Laporan survei siap cetak: tiap denah dengan pin bernomor, diikuti rincian
// per nomor. "Simpan sebagai PDF" memakai dialog cetak bawaan browser.
export default function ProjectReportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const { t, lang } = useTranslation()
  const [projectName, setProjectName] = useState('')
  const [sections, setSections] = useState<PlanSection[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const projectSnap = await getDoc(doc(db, 'projects', projectId))
      const planSnap = await getDocs(collection(db, 'projects', projectId, 'plans'))
      const plans = planSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, 'id'>) }))
        .sort(
          (a, b) =>
            compareFloors(a.floor ?? '', b.floor ?? '') || a.name.localeCompare(b.name, undefined, { numeric: true }),
        )
      const result = await Promise.all(
        plans.map(async (plan) => {
          const snap = await getDocs(collection(db, 'projects', projectId, 'plans', plan.id, 'pins'))
          const pins = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, 'id'>) }))
            .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))
          return { plan, pins }
        }),
      )
      if (cancelled) return
      setProjectName((projectSnap.data()?.name as string | undefined) ?? '')
      setSections(result)
    })().catch((err) => {
      console.error('Gagal memuat laporan:', err)
      if (!cancelled) setError(err instanceof Error ? err.message : String(err))
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const locale = lang === 'id' ? 'id-ID' : 'en-GB'
  const dateOf = (v: unknown) => (toMs(v) ? new Date(toMs(v)).toLocaleDateString(locale) : '')

  if (error) return <p className="p-6 text-sm text-red-600">{t('report.failed', { error })}</p>
  if (!sections) return <p className="p-6 text-sm text-slate-500">{t('report.loading')}</p>

  const withPins = sections.filter((s) => s.pins.length > 0)
  const totalFindings = sections.reduce((n, s) => n + s.pins.filter((p) => p.kind !== 'asset').length, 0)
  const totalAssets = sections.reduce((n, s) => n + s.pins.filter((p) => p.kind === 'asset').length, 0)

  return (
    <div className="report mx-auto max-w-4xl bg-white p-4 text-slate-900 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link
          to={`/projects/${projectId}`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          &larr; {t('report.back')}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {t('report.print')}
        </button>
      </div>
      <p className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 print:hidden">{t('report.printHelp')}</p>

      <header className="mb-6 border-b-2 border-slate-900 pb-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{t('report.title')}</p>
        <h1 className="text-2xl font-bold">{projectName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          {user?.email && ` · ${user.email}`}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t('report.summary', { plans: withPins.length, findings: totalFindings, assets: totalAssets })}
        </p>
      </header>

      {withPins.length === 0 && <p className="text-sm text-slate-500">{t('report.empty')}</p>}

      {withPins.map(({ plan, pins }, sectionIndex) => (
        <section key={plan.id} className={sectionIndex > 0 ? 'mt-10 break-before-page print:mt-0' : ''}>
          <h2 className="mb-2 text-lg font-bold">
            {plan.floor ? `${plan.floor} — ` : ''}
            {plan.name}
            <span className="ml-2 text-sm font-normal text-slate-500">
              {t('revision.label', { revision: plan.revision ?? 1 })}
            </span>
          </h2>

          <div className="relative mb-4 break-inside-avoid border border-slate-300">
            <img src={sized(plan.imageURL, 2000)} alt={plan.name} className="block w-full" />
            {pins.map((pin, i) => (
              <span
                key={pin.id}
                className={`absolute flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-white px-1 text-[10px] font-bold leading-none text-white ${
                  pin.kind === 'asset' ? 'rounded-sm' : 'rounded-full'
                }`}
                style={{
                  left: `${pin.x * 100}%`,
                  top: `${pin.y * 100}%`,
                  backgroundColor: pin.kind === 'asset' ? '#0f172a' : STATUS_COLORS[pin.status],
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <ol className="space-y-3">
            {pins.map((pin, i) => {
              const isAsset = pin.kind === 'asset'
              const photos = pinPhotos(pin)
              const measurements = formatMeasurements(pin.measurements)
              return (
                <li key={pin.id} className="break-inside-avoid rounded-lg border border-slate-300 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`flex h-6 min-w-6 items-center justify-center px-1 text-xs font-bold text-white ${
                        isAsset ? 'rounded-sm' : 'rounded-full'
                      }`}
                      style={{ backgroundColor: isAsset ? '#0f172a' : STATUS_COLORS[pin.status] }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold">
                      {isAsset ? `${pin.assetType || '-'} × ${pin.quantity ?? 0}` : pin.category}
                    </span>
                    {!isAsset && (
                      <span className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">{t(`status.${pin.status}`)}</span>
                    )}
                    {pin.findingType === 'deviation' && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
                        {t('findingType.deviation')}
                      </span>
                    )}
                    {isAsset && pin.action && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        {t(`assetAction.${pin.action}`)}
                      </span>
                    )}
                  </div>

                  {isAsset && (
                    <p className="mt-1 text-sm">
                      {t('assetSummary.line', {
                        good: Math.max(0, (pin.quantity ?? 0) - (pin.damaged ?? 0) - (pin.missing ?? 0)),
                        damaged: pin.damaged ?? 0,
                        missing: pin.missing ?? 0,
                      })}
                    </p>
                  )}
                  {pin.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{pin.notes}</p>}
                  {measurements && (
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{t('measure.title')}:</span> {measurements}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {pin.createdByName}
                    {dateOf(pin.createdAt) && ` · ${dateOf(pin.createdAt)}`}
                    {pin.updatedByName &&
                      pin.updatedByName !== pin.createdByName &&
                      ` · ${t('pinAuthor.updatedBy', { name: pin.updatedByName })}`}
                  </p>

                  {photos.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {photos.map((url) => (
                        <img key={url} src={sized(url, 800)} alt="" className="aspect-[4/3] w-full rounded border border-slate-200 object-cover" />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
