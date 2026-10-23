import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import type { Pin, PinKind, PinStatus, PinUpdate } from '../../types/models'

export function usePins(projectId: string | undefined, planId: string | undefined) {
  const { user } = useAuth()
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !planId) return
    const q = query(
      collection(db, 'projects', projectId, 'plans', planId, 'pins'),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setPins(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Pin, 'id'>),
        })),
      )
      setLoading(false)
    })
    return unsub
  }, [projectId, planId])

  const createPin = async (x: number, y: number, kind: PinKind = 'finding') => {
    if (!projectId || !planId || !user) throw new Error('Missing context')
    const pinRef = doc(collection(db, 'projects', projectId, 'plans', planId, 'pins'))
    const pin: Omit<Pin, 'id'> = {
      projectId,
      planId,
      x,
      y,
      status: 'open',
      category: 'Other',
      notes: '',
      photoPath: null,
      photoURL: null,
      localPhotoPending: false,
      createdBy: user.uid,
      createdByName: user.email ?? '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      kind,
      ...(kind === 'asset' && {
        assetType: '',
        quantity: 0,
        damaged: 0,
        missing: 0,
        countSource: 'manual' as const,
        countPoints: [],
        countPhotoPath: null,
        countPhotoURL: null,
        localCountPhotoPending: false,
      }),
    }
    // Offline-first: jangan tunggu konfirmasi server — snapshot lokal langsung
    // menampilkan pin, dan modal detail bisa langsung terbuka meski koneksi lambat.
    setDoc(pinRef, { ...pin, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(
      (err) => console.error('Gagal menyimpan pin ke server:', err),
    )
    return pinRef.id
  }

  const updatePin = async (pinId: string, data: PinUpdate) => {
    if (!projectId || !planId) throw new Error('Missing context')
    await updateDoc(doc(db, 'projects', projectId, 'plans', planId, 'pins', pinId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  const deletePin = async (pinId: string) => {
    if (!projectId || !planId) throw new Error('Missing context')
    await deleteDoc(doc(db, 'projects', projectId, 'plans', planId, 'pins', pinId))
  }

  return { pins, loading, createPin, updatePin, deletePin }
}

export const STATUS_COLORS: Record<PinStatus, string> = {
  open: '#dc2626',
  in_progress: '#d97706',
  done: '#16a34a',
}

export type { PinStatus }
