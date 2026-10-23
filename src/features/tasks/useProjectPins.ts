import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { usePlans } from '../plans/usePlans'
import type { Pin } from '../../types/models'

// createdAt bisa berupa number atau Firestore Timestamp saat runtime
export function toMs(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  return 0
}

// Kumpulkan semua pin (temuan) dari seluruh denah dalam satu proyek,
// supaya papan tugas bisa menampilkannya seperti task berlokasi di Fieldwire.
export function useProjectPins(projectId: string | undefined) {
  const { plans, loading: plansLoading } = usePlans(projectId)
  const [pinsByPlan, setPinsByPlan] = useState<Record<string, Pin[]>>({})
  const planIdsKey = plans.map((p) => p.id).join(',')

  useEffect(() => {
    if (!projectId || !planIdsKey) {
      setPinsByPlan({})
      return
    }
    const planIds = planIdsKey.split(',')
    setPinsByPlan({})
    const unsubs = planIds.map((planId) =>
      onSnapshot(
        query(collection(db, 'projects', projectId, 'plans', planId, 'pins'), orderBy('createdAt', 'asc')),
        (snap) => {
          setPinsByPlan((prev) => ({
            ...prev,
            [planId]: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, 'id'>) })),
          }))
        },
        (err) => console.error('Gagal memuat pin denah:', err),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [projectId, planIdsKey])

  const pins = useMemo(
    () =>
      Object.values(pinsByPlan)
        .flat()
        // Pin aset bukan tugas; hanya temuan yang tampil di papan tugas
        .filter((p) => p.kind !== 'asset')
        .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt)),
    [pinsByPlan],
  )

  const updatePin = async (
    planId: string,
    pinId: string,
    data: Partial<Pick<Pin, 'status' | 'category' | 'notes'>>,
  ) => {
    if (!projectId) return
    await updateDoc(doc(db, 'projects', projectId, 'plans', planId, 'pins', pinId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  return { pins, plans, plansLoading, updatePin }
}
