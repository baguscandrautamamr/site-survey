import { useEffect, useState } from 'react'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/config'

export interface ProjectMember {
  uid: string
  // Kosong kalau profil penggunanya sudah dihapus
  email: string
  displayName: string
  isOwner: boolean
}

export type AddMemberResult = 'added' | 'notFound' | 'alreadyMember'

// Anggota proyek = daftar uid di field memberUids dokumen proyek. Semua anggota
// punya akses penuh (lihat firestore.rules), termasuk menambah/mengeluarkan anggota.
export function useProjectMembers(projectId: string | undefined) {
  const [memberUids, setMemberUids] = useState<string[]>([])
  const [ownerUid, setOwnerUid] = useState('')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      doc(db, 'projects', projectId),
      (snap) => {
        const data = snap.data() as { memberUids?: string[]; createdBy?: string } | undefined
        setMemberUids(data?.memberUids ?? [])
        setOwnerUid(data?.createdBy ?? '')
        setError('')
      },
      (err) => {
        console.error('Gagal memuat anggota proyek:', err)
        setError(err.message)
        setLoading(false)
      },
    )
  }, [projectId])

  const uidsKey = memberUids.join(',')
  useEffect(() => {
    if (!uidsKey) {
      setMembers([])
      return
    }
    let cancelled = false
    const uids = uidsKey.split(',')
    Promise.all(
      uids.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid))
          const data = snap.data() as { email?: string; displayName?: string } | undefined
          return { uid, email: data?.email ?? '', displayName: data?.displayName ?? '' }
        } catch {
          return { uid, email: '', displayName: '' }
        }
      }),
    ).then((profiles) => {
      if (cancelled) return
      setMembers(profiles.map((p) => ({ ...p, isOwner: p.uid === ownerUid })))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [uidsKey, ownerUid])

  const addMember = async (email: string): Promise<AddMemberResult> => {
    if (!projectId) throw new Error('Missing project')
    // Firebase Auth menyimpan email dalam huruf kecil
    const normalized = email.trim().toLowerCase()
    const found = await getDocs(query(collection(db, 'users'), where('email', '==', normalized), limit(1)))
    if (found.empty) return 'notFound'
    const uid = found.docs[0].id
    if (memberUids.includes(uid)) return 'alreadyMember'
    await updateDoc(doc(db, 'projects', projectId), { memberUids: arrayUnion(uid) })
    return 'added'
  }

  const removeMember = async (uid: string) => {
    if (!projectId) throw new Error('Missing project')
    await updateDoc(doc(db, 'projects', projectId), { memberUids: arrayRemove(uid) })
  }

  return { members, loading, error, addMember, removeMember }
}
