import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import type { Workbook, Worksheet } from 'exceljs'
import { db } from '../../firebase/config'
import { compareFloors } from '../plans/floors'
import { toMs } from '../tasks/useProjectPins'
import type { TranslationKey } from '../../i18n/translations'
import type { Pin, Plan } from '../../types/models'

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string

interface FloorData {
  floor: string
  label: string
  plans: Plan[]
  findings: Array<{ pin: Pin; plan: Plan }>
  assets: Array<{ pin: Pin; plan: Plan }>
}

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F172A' } }
const TITLE_FONT = { bold: true, size: 14 }
const DATE_FORMAT = 'dd/mm/yyyy hh:mm'

// Foto yang akan ditempel ke sel setelah semua sheet selesai dibuat
interface PhotoSlot {
  ws: Worksheet
  row: number
  col: number
  url: string
}

export interface ExportOptions {
  withPhotos: boolean
  onProgress?: (done: number, total: number) => void
}

const PHOTO_PX = 120
const PHOTO_ROW_HEIGHT_PT = 95
const PHOTO_COL_WIDTH = 18

const good = (pin: Pin) => Math.max(0, (pin.quantity ?? 0) - (pin.damaged ?? 0) - (pin.missing ?? 0))

// Nama sheet Excel: maks 31 karakter, tanpa : \ / ? * [ ], dan harus unik
function sheetName(raw: string, used: Set<string>) {
  const base = raw.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet'
  let name = base
  for (let i = 2; used.has(name.toLowerCase()); i++) {
    const suffix = ` (${i})`
    name = base.slice(0, 31 - suffix.length) + suffix
  }
  used.add(name.toLowerCase())
  return name
}

function addTable(ws: Worksheet, startRow: number, headers: string[], rows: unknown[][]) {
  const header = ws.getRow(startRow)
  // Tinggi eksplisit: header yang terbungkus (wrap) tidak di-autofit berbeda-beda
  // antar aplikasi, sehingga posisi foto di baris bawahnya tidak bergeser
  header.height = 30
  headers.forEach((h, i) => {
    const cell = header.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = HEADER_FILL
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  rows.forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r)
    values.forEach((v, c) => {
      const cell = row.getCell(c + 1)
      if (v && typeof v === 'object' && 'hyperlink' in v) {
        cell.value = v as { text: string; hyperlink: string }
        cell.font = { color: { argb: 'FF2563EB' }, underline: true }
      } else {
        cell.value = v as string | number | Date | null
        if (v instanceof Date) cell.numFmt = DATE_FORMAT
      }
      cell.alignment = { vertical: 'top', wrapText: typeof v === 'string' && v.length > 30 }
    })
  })
  return startRow + 1 + rows.length
}

const link = (url: string | null | undefined, text: string) => (url ? { text, hyperlink: url } : '')

// Isi sel foto: link kalau ada URL, keterangan kalau foto masih di antrean offline
function photoCell(url: string | null | undefined, pending: boolean | undefined, t: T) {
  if (url) return link(url, t('export.openPhoto'))
  return pending ? t('export.photoPending') : ''
}

// Versi kecil dari Cloudinary supaya file Excel tidak membengkak
export function thumbnailUrl(url: string) {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/f_jpg,c_limit,w_480,h_480,q_70/') : url
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchPhoto(url: string) {
  const res = await fetch(thumbnailUrl(url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const extension = blob.type.includes('png') ? 'png' : blob.type.includes('gif') ? 'gif' : 'jpeg'
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return { base64: await blobToBase64(blob), extension: extension as 'png' | 'gif' | 'jpeg', size }
}

async function embedPhotos(wb: Workbook, slots: PhotoSlot[], onProgress?: ExportOptions['onProgress']) {
  let done = 0
  onProgress?.(0, slots.length)
  const queue = [...slots]
  const worker = async () => {
    for (let slot = queue.shift(); slot; slot = queue.shift()) {
      try {
        const photo = await fetchPhoto(slot.url)
        const scale = Math.min(PHOTO_PX / photo.size.width, PHOTO_PX / photo.size.height, 1)
        const imageId = wb.addImage({ base64: photo.base64, extension: photo.extension })
        // Gambar menggantikan teks link di sel; klik gambar membuka foto ukuran penuh
        slot.ws.getCell(slot.row, slot.col).value = null
        slot.ws.getRow(slot.row).height = PHOTO_ROW_HEIGHT_PT
        slot.ws.getColumn(slot.col).width = PHOTO_COL_WIDTH
        slot.ws.addImage(imageId, {
          tl: { col: slot.col - 1 + 0.05, row: slot.row - 1 + 0.05 },
          ext: { width: photo.size.width * scale, height: photo.size.height * scale },
          hyperlinks: { hyperlink: slot.url, tooltip: slot.url },
        })
      } catch (err) {
        // Foto gagal diunduh: biarkan link teks "Lihat foto" di sel
        console.error('Gagal mengambil foto untuk Excel:', slot.url, err)
      }
      onProgress?.(++done, slots.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
}

async function loadProject(projectId: string, noFloorLabel: string) {
  const projectSnap = await getDoc(doc(db, 'projects', projectId))
  const projectName = (projectSnap.data()?.name as string | undefined) ?? projectId

  const planSnap = await getDocs(collection(db, 'projects', projectId, 'plans'))
  const plans = planSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, 'id'>) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const pinsByPlan = await Promise.all(
    plans.map(async (plan) => {
      const snap = await getDocs(collection(db, 'projects', projectId, 'plans', plan.id, 'pins'))
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, 'id'>) }))
        .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))
        .map((pin) => ({ pin, plan }))
    }),
  )

  const floors = new Map<string, FloorData>()
  plans.forEach((plan, i) => {
    const floor = plan.floor?.trim() ?? ''
    const data = floors.get(floor) ?? { floor, label: floor || noFloorLabel, plans: [], findings: [], assets: [] }
    data.plans.push(plan)
    for (const item of pinsByPlan[i]) {
      if (item.pin.kind === 'asset') data.assets.push(item)
      else data.findings.push(item)
    }
    floors.set(floor, data)
  })

  return { projectName, floors: [...floors.values()].sort((a, b) => compareFloors(a.floor, b.floor)) }
}

function addSummarySheet(wb: Workbook, name: string, projectName: string, floors: FloorData[], t: T) {
  const ws = wb.addWorksheet(name)
  ws.getCell('A1').value = t('export.title', { project: projectName })
  ws.getCell('A1').font = TITLE_FONT
  ws.getCell('A2').value = t('export.generatedAt')
  ws.getCell('B2').value = new Date()
  ws.getCell('B2').numFmt = DATE_FORMAT

  const rows = floors.map((f) => {
    const count = (s: Pin['status']) => f.findings.filter(({ pin }) => pin.status === s).length
    const sum = (fn: (p: Pin) => number) => f.assets.reduce((n, { pin }) => n + fn(pin), 0)
    return [
      f.label,
      f.plans.length,
      f.findings.length,
      count('open'),
      count('in_progress'),
      count('done'),
      sum((p) => p.quantity ?? 0),
      sum(good),
      sum((p) => p.damaged ?? 0),
      sum((p) => p.missing ?? 0),
    ]
  })
  const totals = rows[0]?.map((_, c) => (c === 0 ? t('export.total') : rows.reduce((n, r) => n + (r[c] as number), 0))) ?? []
  const end = addTable(
    ws,
    4,
    [
      t('export.floor'),
      t('export.planCount'),
      t('export.findingCount'),
      t('status.open'),
      t('status.in_progress'),
      t('status.done'),
      t('export.assetUnits'),
      t('assetForm.good'),
      t('assetForm.damaged'),
      t('assetForm.missing'),
    ],
    totals.length ? [...rows, totals] : rows,
  )
  if (totals.length) ws.getRow(end - 1).font = { bold: true }
  ws.columns.forEach((col, i) => (col.width = i === 0 ? 22 : 13))
  ws.views = [{ state: 'frozen', ySplit: 4 }]
}

function addAssetRecapSheet(wb: Workbook, name: string, floors: FloorData[], t: T) {
  const ws = wb.addWorksheet(name)
  const rows: unknown[][] = []
  for (const f of floors) {
    const byType = new Map<string, Pin[]>()
    for (const { pin } of f.assets) {
      const key = pin.assetType || '-'
      byType.set(key, [...(byType.get(key) ?? []), pin])
    }
    for (const [type, pins] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const sum = (fn: (p: Pin) => number) => pins.reduce((n, p) => n + fn(p), 0)
      rows.push([f.label, type, sum((p) => p.quantity ?? 0), sum(good), sum((p) => p.damaged ?? 0), sum((p) => p.missing ?? 0)])
    }
  }
  if (rows.length === 0) rows.push([t('export.noAssets')])
  addTable(
    ws,
    1,
    [t('export.floor'), t('assetSummary.type'), t('assetSummary.total'), t('assetForm.good'), t('assetForm.damaged'), t('assetForm.missing')],
    rows,
  )
  ws.columns.forEach((col, i) => (col.width = i < 2 ? 24 : 12))
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

function addFloorSheet(wb: Workbook, name: string, f: FloorData, t: T, photos: PhotoSlot[] | null) {
  const ws = wb.addWorksheet(name)
  ws.getCell('A1').value = f.label
  ws.getCell('A1').font = TITLE_FONT
  ws.getCell('A2').value = t('export.plansOnFloor', { plans: f.plans.map((p) => p.name).join(', ') })

  ws.getCell('A4').value = t('export.findingsHeading', { count: f.findings.length })
  ws.getCell('A4').font = { bold: true, size: 12 }
  const findingRows = f.findings.map(({ pin, plan }, i) => [
    i + 1,
    plan.name,
    pin.category,
    t(`status.${pin.status}`),
    pin.notes,
    pin.createdByName,
    toMs(pin.createdAt) ? new Date(toMs(pin.createdAt)) : null,
    photoCell(pin.photoURL, pin.localPhotoPending, t),
  ])
  f.findings.forEach(({ pin }, i) => {
    if (photos && pin.photoURL) photos.push({ ws, row: 6 + i, col: 8, url: pin.photoURL })
  })
  let row = addTable(
    ws,
    5,
    [
      t('export.no'),
      t('export.plan'),
      t('pinForm.category'),
      t('pinForm.status'),
      t('pinForm.notes'),
      t('export.createdBy'),
      t('export.date'),
      t('pinForm.photo'),
    ],
    findingRows.length ? findingRows : [[t('export.noFindings')]],
  )

  row += 2
  ws.getCell(row, 1).value = t('export.assetsHeading', { count: f.assets.length })
  ws.getCell(row, 1).font = { bold: true, size: 12 }
  const assetRows = f.assets.map(({ pin, plan }, i) => [
    i + 1,
    plan.name,
    pin.assetType || '-',
    pin.quantity ?? 0,
    good(pin),
    pin.damaged ?? 0,
    pin.missing ?? 0,
    pin.countSource === 'ai' ? 'AI' : t('assetForm.manual'),
    pin.notes,
    pin.createdByName,
    toMs(pin.createdAt) ? new Date(toMs(pin.createdAt)) : null,
    photoCell(pin.photoURL, pin.localPhotoPending, t),
    photoCell(pin.countPhotoURL, pin.localCountPhotoPending, t),
  ])
  f.assets.forEach(({ pin }, i) => {
    if (!photos) return
    if (pin.photoURL) photos.push({ ws, row: row + 2 + i, col: 12, url: pin.photoURL })
    if (pin.countPhotoURL) photos.push({ ws, row: row + 2 + i, col: 13, url: pin.countPhotoURL })
  })
  addTable(
    ws,
    row + 1,
    [
      t('export.no'),
      t('export.plan'),
      t('assetSummary.type'),
      t('assetForm.quantity'),
      t('assetForm.good'),
      t('assetForm.damaged'),
      t('assetForm.missing'),
      t('export.countMethod'),
      t('pinForm.notes'),
      t('export.createdBy'),
      t('export.date'),
      t('assetForm.evidencePhoto'),
      t('export.countPhoto'),
    ],
    assetRows.length ? assetRows : [[t('export.noAssets')]],
  )

  const widths = [6, 22, 20, 12, 40, 22, 17, 14, 40, 22, 17, 14, 14]
  ws.columns.forEach((col, i) => (col.width = widths[i] ?? 14))
}

// Rekap seluruh proyek ke Excel: Ringkasan, Rekap Aset, lalu satu sheet per lantai
// berisi temuan & aset dari semua denah di lantai tersebut.
export async function exportProjectExcel(projectId: string, t: T, { withPhotos, onProgress }: ExportOptions) {
  const [{ default: ExcelJS }, { projectName, floors }] = await Promise.all([
    import('exceljs'),
    loadProject(projectId, t('export.noFloor')),
  ])

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const used = new Set<string>()
  addSummarySheet(wb, sheetName(t('export.sheetSummary'), used), projectName, floors, t)
  addAssetRecapSheet(wb, sheetName(t('export.sheetAssets'), used), floors, t)
  const photos: PhotoSlot[] | null = withPhotos ? [] : null
  for (const f of floors) addFloorSheet(wb, sheetName(f.label, used), f, t, photos)
  if (photos?.length) await embedPhotos(wb, photos, onProgress)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const date = new Date().toISOString().slice(0, 10)
  const safeName = projectName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'proyek'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Rekap ${safeName} ${date}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
