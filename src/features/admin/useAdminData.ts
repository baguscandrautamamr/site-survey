import { useEffect, useState } from 'react'
import {
  collection,
  collectionGroup,
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
import type { Pin, Project, UserProfile, UserRole } from '../../types/models'

export function useAllUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) })))
      setLoading(false)
    })
  }, [])

  const setUserRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role })
  }

  const deleteUserProfile = async (uid: string) => {
    await setDoc(doc(db, 'bannedUsers', uid), { bannedAt: serverTimestamp() })
    await deleteDoc(doc(db, 'users', uid))
  }

  return { users, loading, setUserRole, deleteUserProfile }
}

export function useAllProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) })))
      setLoading(false)
    })
  }, [])

  const renameProject = async (projectId: string, name: string) => {
    await updateDoc(doc(db, 'projects', projectId), { name })
  }

  const deleteProject = async (projectId: string) => {
    await deleteDoc(doc(db, 'projects', projectId))
  }

  return { projects, loading, renameProject, deleteProject }
}

export function useAllPhotos() {
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collectionGroup(db, 'pins'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setPins(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Pin, 'id'>) }))
          .filter((p) => !!p.photoURL),
      )
      setLoading(false)
    })
  }, [])

  const clearPhoto = async (pin: Pin) => {
    await updateDoc(doc(db, 'projects', pin.projectId, 'plans', pin.planId, 'pins', pin.id), {
      photoURL: null,
      photoPath: null,
      localPhotoPending: false,
    })
  }

  return { pins, loading, clearPhoto }
}
