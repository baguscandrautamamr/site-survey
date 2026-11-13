import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Sisi terpanjang hasil render. Cukup tajam untuk membaca teks kecil gambar A1/A0
// saat di-zoom, tapi masih di bawah batas kanvas iOS (~16,7 juta piksel).
export const PLAN_MAX_DIMENSION = 4000

export async function getPdfPageCount(file: File): Promise<number> {
  const task = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
  try {
    return (await task.promise).numPages
  } finally {
    task.destroy()
  }
}

export async function renderPdfPageToBlob(
  file: File,
  pageNumber = 1,
  maxDimension = PLAN_MAX_DIMENSION,
): Promise<Blob> {
  const task = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
  try {
    const pdf = await task.promise
    const page = await pdf.getPage(pageNumber)

    const baseViewport = page.getViewport({ scale: 1 })
    const scale = maxDimension / Math.max(baseViewport.width, baseViewport.height)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Tidak bisa membuat canvas untuk render PDF')

    // intent: 'print' disables pdf.js's requestAnimationFrame-based render scheduling,
    // which never fires (and hangs the render forever) when the tab isn't visible/focused.
    await page.render({ canvasContext: context, canvas, viewport, intent: 'print' }).promise

    // JPEG: PNG gambar teknik sebesar ini bisa puluhan MB dan melewati batas upload
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    // Lepas memori kanvas besar secepatnya (penting di HP)
    canvas.width = 0
    canvas.height = 0
    if (!blob) throw new Error('Gagal mengonversi halaman PDF menjadi gambar')
    return blob
  } finally {
    task.destroy()
  }
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
