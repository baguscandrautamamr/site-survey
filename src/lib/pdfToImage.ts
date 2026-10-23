import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function renderPdfFirstPageToBlob(file: File, maxDimension = 2000): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const baseViewport = page.getViewport({ scale: 1 })
  const scale = maxDimension / Math.max(baseViewport.width, baseViewport.height)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tidak bisa membuat canvas untuk render PDF')

  // intent: 'print' disables pdf.js's requestAnimationFrame-based render scheduling,
  // which never fires (and hangs the render forever) when the tab isn't visible/focused.
  await page.render({ canvasContext: context, canvas, viewport, intent: 'print' }).promise

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Gagal mengonversi halaman PDF menjadi gambar')
  return blob
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
