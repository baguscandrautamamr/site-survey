import { useEffect, useState } from 'react'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import imageCompression from 'browser-image-compression'
import { db } from '../../firebase/config'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { PLAN_MAX_DIMENSION, isPdfFile, renderPdfPageToBlob } from '../../lib/pdfToImage'
import { useAuth } from '../auth/useAuth'
import type { Plan, PlanRevision } from '../../types/models'

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

// Siapkan gambar denah (halaman PDF dirender dulu) lalu upload ke Cloudinary.
async function uploadPlanImage(file: File, page: number, idForName: string) {
  let imageFile = file
  if (isPdfFile(file)) {
    const blob = await renderPdfPageToBlob(file, page)
    imageFile = new File([blob], file.name.replace(/\.pdf$/i, `-p${page}.jpg`), { type: 'image/jpeg' })
  }
  const compressed = await imageCompression(imageFile, {
    maxWidthOrHeight: PLAN_MAX_DIMENSION,
    // Batas upload gambar Cloudinary paket gratis 10 MB
    maxSizeMB: 4,
    initialQuality: 0.9,
    useWebWorker: true,
  })
  const { width, height } = await loadImageDimensions(compressed)
  const { url, publicId } = await uploadToCloudinary(compressed, `plan-${idForName}-${imageFile.name}`)
  return { imagePath: publicId, imageURL: url, imageWidth: width, imageHeight: height }
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

  const uploadPlan = async (name: string, file: File, floor = '', page = 1) => {
    if (!projectId || !user) throw new Error('Missing project or user')
    setUploading(true)
    try {
      const planRef = doc(collection(db, 'projects', projectId, 'plans'))
      const image = await uploadPlanImage(file, page, planRef.id)
      await setDoc(planRef, {
        projectId,
        name,
        floor,
        ...image,
        revision: 1,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      return planRef.id
    } finally {
      setUploading(false)
    }
  }

  // Ganti gambar denah dengan revisi baru. Pin, anotasi, dan kalibrasi tetap di
  // dokumen yang sama (posisi pin dinormalisasi 0..1), dan gambar lama disimpan
  // di `revisions` supaya bisa dibandingkan.
  const uploadRevision = async (plan: Plan, file: File, page = 1) => {
    if (!projectId || !user) throw new Error('Missing project or user')
    setUploading(true)
    try {
      const current = plan.revision ?? 1
      const image = await uploadPlanImage(file, page, `${plan.id}-rev${current + 1}`)
      const previous: PlanRevision = {
        revision: current,
        imagePath: plan.imagePath,
        imageURL: plan.imageURL,
        imageWidth: plan.imageWidth,
        imageHeight: plan.imageHeight,
        replacedAt: Date.now(),
        replacedByName: user.email ?? '',
      }
      await updateDoc(doc(db, 'projects', projectId, 'plans', plan.id), {
        ...image,
        revision: current + 1,
        revisions: arrayUnion(previous),
      })
    } finally {
      setUploading(false)
    }
  }

  const deletePlan = async (planId: string) => {
    if (!projectId) throw new Error('Missing project')
    await deleteDoc(doc(db, 'projects', projectId, 'plans', planId))
  }

  const setPlansFloor = async (planIds: string[], floor: string) => {
    if (!projectId) throw new Error('Missing project')
    const batch = writeBatch(db)
    for (const planId of planIds) {
      batch.update(doc(db, 'projects', projectId, 'plans', planId), { floor })
    }
    await batch.commit()
  }

  return { plans, loading, uploading, uploadPlan, uploadRevision, deletePlan, setPlansFloor }
}
