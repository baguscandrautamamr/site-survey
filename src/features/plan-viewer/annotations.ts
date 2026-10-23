import { useCallback, useEffect, useState } from 'react'

// Alat gambar ala Fieldwire. Anotasi disimpan di localStorage per denah
// (bukan di Firestore) sehingga skema database tidak berubah.
export type Tool = 'select' | 'pin' | 'pen' | 'shape' | 'text' | 'measure'
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

export function useAnnotations(projectId?: string, planId?: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>(() =>
    readAnnotations(projectId, planId),
  )

  useEffect(() => {
    setAnnotations(readAnnotations(projectId, planId))
  }, [projectId, planId])

  useEffect(() => {
    if (!projectId || !planId) return
    try {
      localStorage.setItem(storageKey(projectId, planId), JSON.stringify(annotations))
    } catch {
      // localStorage penuh — anotasi tetap tampil selama sesi berjalan
    }
  }, [annotations, projectId, planId])

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation])
  }, [])

  const updateAnnotation = useCallback((id: string, data: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? ({ ...a, ...data } as Annotation) : a)),
    )
  }, [])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const undo = useCallback(() => {
    setAnnotations((prev) => prev.slice(0, -1))
  }, [])

  return { annotations, addAnnotation, updateAnnotation, removeAnnotation, undo }
}

export function newAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Kalibrasi skala: berapa piksel gambar = berapa meter di lapangan.
// Disimpan per denah di localStorage, bukan di Firestore.
export interface Calibration {
  pixels: number // jarak garis kalibrasi dalam piksel gambar
  meters: number // panjang asli garis tersebut dalam meter
}

const calibrationKey = (projectId: string, planId: string) =>
  `site-survey-calibration:${projectId}:${planId}`

export function useCalibration(projectId?: string, planId?: string) {
  const [calibration, setCalibrationState] = useState<Calibration | null>(() => {
    if (!projectId || !planId) return null
    try {
      const raw = localStorage.getItem(calibrationKey(projectId, planId))
      return raw ? (JSON.parse(raw) as Calibration) : null
    } catch {
      return null
    }
  })

  const setCalibration = useCallback(
    (value: Calibration | null) => {
      setCalibrationState(value)
      if (!projectId || !planId) return
      try {
        if (value) localStorage.setItem(calibrationKey(projectId, planId), JSON.stringify(value))
        else localStorage.removeItem(calibrationKey(projectId, planId))
      } catch {
        // localStorage penuh — kalibrasi tetap berlaku selama sesi berjalan
      }
    },
    [projectId, planId],
  )

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
