import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'

// Alat gambar ala Fieldwire.
export type Tool = 'select' | 'pin' | 'asset' | 'pen' | 'shape' | 'text' | 'measure'
export type PenVariant = 'freehand' | 'line' | 'arrow'
export type ShapeVariant =
  | 'cloud'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'rectFilled'
  | 'ellipseFilled'
  | 'triangleFilled'

export interface Point {
  x: number
  y: number
}

interface BaseAnnotation {
  id: string
  color: string
  createdAt: number
  // Pembuat anotasi (kosong untuk anotasi lama yang dipindahkan dari perangkat)
  createdBy?: string
  createdByName?: string
}

export interface FreehandAnnotation extends BaseAnnotation {
  kind: 'freehand'
  points: Point[]
}

export interface LineAnnotation extends BaseAnnotation {
  kind: 'line' | 'arrow' | 'measure'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ShapeAnnotation extends BaseAnnotation {
  kind: 'cloud' | 'rect' | 'ellipse' | 'triangle'
  x: number
  y: number
  w: number
  h: number
  filled: boolean
}

export interface TextAnnotation extends BaseAnnotation {
  kind: 'text'
  x: number
  y: number
  w: number
  h: number
  text: string
  fontSize: number
}

export type Annotation = FreehandAnnotation | LineAnnotation | ShapeAnnotation | TextAnnotation

export const ANNOTATION_COLORS = [
  '#dc2626',
  '#ea580c',
  '#eab308',
  '#16a34a',
  '#2563eb',
  '#9333ea',
  '#0f172a',
  '#ffffff',
]

export const TEXT_FONT_SIZES = [8, 12, 16, 22, 30]

const storageKey = (projectId: string, planId: string) =>
  `site-survey-annotations:${projectId}:${planId}`

function readAnnotations(projectId?: string, planId?: string): Annotation[] {
  if (!projectId || !planId) return []
  try {
    const raw = localStorage.getItem(storageKey(projectId, planId))
    return raw ? (JSON.parse(raw) as Annotation[]) : []
  } catch {
    return []
  }
}

// Anotasi disimpan di Firestore (projects/{p}/plans/{plan}/annotations) supaya
// terlihat oleh semua anggota proyek. Kalau koleksi itu tidak bisa dibaca
// (firestore.rules lama belum punya aturannya), hook ini jatuh kembali ke
// localStorage per perangkat seperti versi sebelumnya, jadi alat gambar tetap jalan.
export function useAnnotations(projectId?: string, planId?: string) {
  const { user } = useAuth()
  const [local, setLocal] = useState<Annotation[]>(() => readAnnotations(projectId, planId))
  // null = belum tersambung / mode lokal
  const [remote, setRemote] = useState<Annotation[] | null>(null)
  // Perubahan posisi saat digeser: tampil langsung, ditulis ke server setelah berhenti
  const [overrides, setOverrides] = useState<Record<string, Partial<Annotation>>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const flushed = useRef<Set<string>>(new Set())
  const pendingMoves = useRef<Record<string, Partial<Annotation>>>({})
  const migrated = useRef(false)

  useEffect(() => {
    setLocal(readAnnotations(projectId, planId))
    setRemote(null)
    setOverrides({})
    migrated.current = false
    if (!projectId || !planId) return
    const col = collection(db, 'projects', projectId, 'plans', planId, 'annotations')
    return onSnapshot(
      query(col, orderBy('createdAt', 'asc')),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...(d.data() as Annotation), id: d.id }))
        setRemote(docs)
        if (flushed.current.size) {
          const done = flushed.current
          flushed.current = new Set()
          setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !done.has(id))))
        }
        // Pindahkan anotasi lama dari perangkat ini ke server, sekali, dan hanya
        // setelah server memastikan koleksinya bisa diakses (bukan dari cache).
        if (!migrated.current && !snap.metadata.fromCache) {
          migrated.current = true
          const existing = new Set(docs.map((d) => d.id))
          const mine = readAnnotations(projectId, planId).filter((a) => !existing.has(a.id))
          if (mine.length) {
            Promise.all(mine.map((a) => setDoc(doc(col, a.id), toFirestore(a))))
              .then(() => {
                localStorage.removeItem(storageKey(projectId, planId))
                setLocal([])
              })
              .catch((err) => console.error('Gagal memindahkan anotasi lokal:', err))
          }
        }
      },
      (err) => {
        console.warn('Anotasi tidak bisa disinkronkan, memakai penyimpanan lokal:', err.code)
        setRemote(null)
      },
    )
  }, [projectId, planId])

  const synced = remote !== null
  useEffect(() => {
    if (!projectId || !planId || synced) return
    try {
      localStorage.setItem(storageKey(projectId, planId), JSON.stringify(local))
    } catch {
      // localStorage penuh — anotasi tetap tampil selama sesi berjalan
    }
  }, [local, projectId, planId, synced])

  const annotations = useMemo(
    () => (remote ? remote.map((a) => (overrides[a.id] ? ({ ...a, ...overrides[a.id] } as Annotation) : a)) : local),
    [remote, overrides, local],
  )

  const docRef = useCallback(
    (id: string) => doc(db, 'projects', projectId!, 'plans', planId!, 'annotations', id),
    [projectId, planId],
  )
  const uid = user?.uid
  const email = user?.email ?? ''

  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      if (!synced) return setLocal((prev) => [...prev, annotation])
      setDoc(docRef(annotation.id), toFirestore({ ...annotation, createdBy: uid, createdByName: email })).catch((err) =>
        console.error('Gagal menyimpan anotasi:', err),
      )
    },
    [synced, docRef, uid, email],
  )

  const updateAnnotation = useCallback(
    (id: string, data: Partial<Annotation>) => {
      if (!synced) {
        return setLocal((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...data } as Annotation) : a)))
      }
      const merged = { ...pendingMoves.current[id], ...data }
      pendingMoves.current[id] = merged
      setOverrides((prev) => ({ ...prev, [id]: merged }))
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => {
        delete timers.current[id]
        delete pendingMoves.current[id]
        flushed.current.add(id)
        updateDoc(docRef(id), toFirestore(merged)).catch((err) => console.error('Gagal menggeser anotasi:', err))
      }, 400)
    },
    [synced, docRef],
  )

  const removeAnnotation = useCallback(
    (id: string) => {
      if (!synced) return setLocal((prev) => prev.filter((a) => a.id !== id))
      deleteDoc(docRef(id)).catch((err) => console.error('Gagal menghapus anotasi:', err))
    },
    [synced, docRef],
  )

  // Urungkan = hapus anotasi terakhir milik pengguna ini (bukan milik anggota lain)
  const undoTarget = remote
    ? [...remote].reverse().find((a) => !a.createdBy || a.createdBy === uid)
    : local[local.length - 1]
  const undoId = undoTarget?.id
  const undo = useCallback(() => {
    if (undoId) removeAnnotation(undoId)
  }, [undoId, removeAnnotation])

  return { annotations, addAnnotation, updateAnnotation, removeAnnotation, undo, canUndo: !!undoId, synced }
}

// Firestore menolak nilai undefined
function toFirestore<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function newAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Kalibrasi skala: berapa piksel gambar = berapa meter di lapangan.
export interface Calibration {
  pixels: number // jarak garis kalibrasi dalam piksel gambar
  meters: number // panjang asli garis tersebut dalam meter
}

const calibrationKey = (projectId: string, planId: string) =>
  `site-survey-calibration:${projectId}:${planId}`

// `remote` = field calibration di dokumen denah (undefined selama denah belum termuat).
// Nilai di server menang; nilai lokal lama dinaikkan ke server sekali supaya
// kalibrasi yang sudah dibuat di perangkat ini ikut terlihat anggota lain.
export function useCalibration(projectId?: string, planId?: string, remote?: Calibration | null, planLoaded = false) {
  const [local, setLocal] = useState<Calibration | null>(() => {
    if (!projectId || !planId) return null
    try {
      const raw = localStorage.getItem(calibrationKey(projectId, planId))
      return raw ? (JSON.parse(raw) as Calibration) : null
    } catch {
      return null
    }
  })

  const save = useCallback(
    (value: Calibration | null) => {
      if (!projectId || !planId) return
      updateDoc(doc(db, 'projects', projectId, 'plans', planId), { calibration: value }).catch((err) =>
        console.error('Gagal menyimpan kalibrasi:', err),
      )
    },
    [projectId, planId],
  )

  const hasRemote = !!remote
  useEffect(() => {
    if (planLoaded && !hasRemote && local) save(local)
    // Hanya sekali saat denah termuat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded])

  const setCalibration = useCallback(
    (value: Calibration | null) => {
      setLocal(value)
      save(value)
      if (!projectId || !planId) return
      try {
        if (value) localStorage.setItem(calibrationKey(projectId, planId), JSON.stringify(value))
        else localStorage.removeItem(calibrationKey(projectId, planId))
      } catch {
        // localStorage penuh — kalibrasi tetap berlaku selama sesi berjalan
      }
    },
    [projectId, planId, save],
  )

  // remote === null berarti kalibrasi sengaja dihapus oleh seseorang
  const calibration = planLoaded && remote !== undefined ? remote : local
  return { calibration, setCalibration }
}

export function formatDistance(distImagePx: number, calibration: Calibration | null): string {
  if (!calibration || calibration.pixels <= 0 || calibration.meters <= 0) {
    return `${Math.round(distImagePx)} px`
  }
  const meters = (distImagePx / calibration.pixels) * calibration.meters
  if (meters < 1) return `${Math.round(meters * 100)} cm`
  return `${meters.toFixed(2).replace('.', ',')} m`
}
