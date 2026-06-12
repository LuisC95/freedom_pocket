// Compresión de imágenes en el navegador antes de enviarlas a las server
// actions de escaneo. Reduce payload (límite de body) y costo de tokens.
'use client'

import type { VisionImage } from '@/lib/ai/gemini'

const MAX_DIMENSION = 1600
const TARGET_BASE64_CHARS = 1_200_000 // ~900KB binario por imagen
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45]

export async function fileToVisionImage(file: File): Promise<VisionImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen. Usa JPG, PNG o WebP.')
  }

  let bitmap: ImageBitmap
  try {
    // 'from-image' respeta la orientación EXIF de fotos de cámara
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No se pudo leer la imagen. Intenta con formato JPG o PNG.')
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('No se pudo procesar la imagen en este navegador')
  }
  // Fondo blanco para PNGs con transparencia (JPEG no soporta alpha)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let dataUrl = ''
  for (const quality of QUALITY_STEPS) {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= TARGET_BASE64_CHARS) break
  }

  const dataBase64 = dataUrl.split(',')[1] ?? ''
  if (!dataBase64) throw new Error('No se pudo convertir la imagen')

  return { mimeType: 'image/jpeg', dataBase64 }
}

export async function filesToVisionImages(files: FileList | File[]): Promise<VisionImage[]> {
  const list = Array.from(files)
  return Promise.all(list.map(fileToVisionImage))
}
