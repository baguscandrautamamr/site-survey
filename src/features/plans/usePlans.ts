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
} from 'firebase/firestore'
import imageCompression from 'browser-image-compression'
import { db } from '../../firebase/config'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { isPdfFile, renderPdfFirstPageToBlob } from '../../lib/pdfToImage'
import { useAuth } from '../auth/useAuth'
import type { Plan } from '../../types/models'

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = reject
    img.src = url
  })
}

export function usePlans(projectId: string | undefined) {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    const q = query(collection(db, 'projects', projectId, 'plans'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setPlans(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Plan, 'id'>),
        })),
      )
      setLoading(false)
    })
    return unsub
  }, [projectId])

  const uploadPlan = async (name: string, file: File) => {
    if (!projectId || !user) throw new Error('Missing project or user')
    setUploading(true)
    try {
      let imageFile = file
      if (isPdfFile(file)) {
        const pngBlob = await renderPdfFirstPageToBlob(file)
        imageFile = new File([pngBlob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
      }

      const compressed = await imageCompression(imageFile, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 1.5,
        useWebWorker: true,
      })
      const { width, height } = await loadImageDimensions(compressed)

      const planRef = doc(collection(db, 'projects', projectId, 'plans'))
      const { url: imageURL, publicId: imagePath } = await uploadToCloudinary(
        compressed,
        `plan-${planRef.id}-${imageFile.name}`,
      )

      await setDoc(planRef, {
        projectId,
        name,
        imagePath,
        imageURL,
        imageWidth: width,
        imageHeight: height,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      return planRef.id
    } finally {
      setUploading(false)
    }
  }

  const deletePlan = async (planId: string) => {
    if (!projectId) throw new Error('Missing project')
    await deleteDoc(doc(db, 'projects', projectId, 'plans', planId))
  }

  return { plans, loading, uploading, uploadPlan, deletePlan }
}
