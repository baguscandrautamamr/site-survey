import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { Category } from '../../types/models'

export const DEFAULT_CATEGORIES: Array<{ id: string; name: string; color: string }> = [
  { id: 'default-structural', name: 'Structural', color: '#2563eb' },
  { id: 'default-electrical', name: 'Electrical', color: '#eab308' },
  { id: 'default-plumbing', name: 'Plumbing', color: '#0891b2' },
  { id: 'default-finishing', name: 'Finishing', color: '#9333ea' },
  { id: 'default-other', name: 'Other', color: '#6b7280' },
]

export const FALLBACK_CATEGORY_COLOR = '#6b7280'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })),
      )
      setLoading(false)
    })
    return unsub
  }, [])

  return { categories, loading }
}

export function colorForCategory(categories: Category[], name: string): string {
  return categories.find((c) => c.name === name)?.color ?? FALLBACK_CATEGORY_COLOR
}

export async function seedDefaultCategoriesIfEmpty() {
  const snap = await getDocs(collection(db, 'categories'))
  if (!snap.empty) return
  await Promise.all(
    DEFAULT_CATEGORIES.map(({ id, ...c }) =>
      setDoc(doc(db, 'categories', id), { ...c, createdAt: serverTimestamp() }),
    ),
  )
}

export async function addCategory(name: string, color: string) {
  await addDoc(collection(db, 'categories'), { name, color, createdAt: serverTimestamp() })
}

export async function updateCategory(id: string, data: Partial<Pick<Category, 'name' | 'color'>>) {
  await updateDoc(doc(db, 'categories', id), data)
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, 'categories', id))
}
