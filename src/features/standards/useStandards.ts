import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../auth/useAuth'
import type { Standard } from '../../types/models'

export async function uploadPdfToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_PDF_PRESET || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary belum dikonfigurasi.')

  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload PDF gagal (${res.status})`)
  const data = (await res.json()) as { secure_url: string; public_id: string }
  return { url: data.secure_url, publicId: data.public_id }
}

export function useStandards() {
  const { user } = useAuth()
  const [standards, setStandards] = useState<Standard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'standards'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setStandards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Standard, 'id'>) })))
      setLoading(false)
    })
    return unsub
  }, [])

  const addStandard = async (file: File, name: string, type: Standard['type']) => {
    if (!user) return
    const { url, publicId } = await uploadPdfToCloudinary(file)
    await addDoc(collection(db, 'standards'), {
      name,
      type,
      pdfURL: url,
      pdfPublicId: publicId,
      fileName: file.name,
      uploadedBy: user.uid,
      createdAt: Date.now(),
    } satisfies Omit<Standard, 'id'>)
  }

  const deleteStandard = async (standardId: string) => {
    await deleteDoc(doc(db, 'standards', standardId))
  }

  return { standards, loading, addStandard, deleteStandard }
}
