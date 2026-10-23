import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import type { Project } from '../../types/models'

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProjects([])
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'projects'),
      where('memberUids', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setProjects(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, 'id'>),
        })),
      )
      setLoading(false)
    })
    return unsub
  }, [user])

  const createProject = async (name: string) => {
    if (!user) throw new Error('Not signed in')
    await addDoc(collection(db, 'projects'), {
      name,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      memberUids: [user.uid],
    })
  }

  const deleteProject = async (projectId: string) => {
    await deleteDoc(doc(db, 'projects', projectId))
  }

  return { projects, loading, createProject, deleteProject }
}
