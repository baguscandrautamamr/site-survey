import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import type { Task } from '../../types/models'

export function useTasks(projectId: string | undefined) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    const q = query(
      collection(db, 'projects', projectId, 'tasks'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) })))
        setLoading(false)
      },
      (err) => {
        console.error('Gagal memuat tugas:', err)
        setTasks([])
        setLoading(false)
      },
    )
    return unsub
  }, [projectId])

  const createTask = async (title: string, status: Task['status'] = 'open') => {
    if (!projectId || !user) return
    await addDoc(collection(db, 'projects', projectId, 'tasks'), {
      projectId,
      title,
      description: '',
      status,
      priority: 'medium',
      createdBy: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies Omit<Task, 'id'>)
  }

  const updateTask = async (taskId: string, data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>>) => {
    if (!projectId) return
    await updateDoc(doc(db, 'projects', projectId, 'tasks', taskId), {
      ...data,
      updatedAt: Date.now(),
    })
  }

  const deleteTask = async (taskId: string) => {
    if (!projectId) return
    await deleteDoc(doc(db, 'projects', projectId, 'tasks', taskId))
  }

  return { tasks, loading, createTask, updateTask, deleteTask }
}
