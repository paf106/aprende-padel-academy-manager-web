export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Spanish message (shown to the user) when the file cannot be used, or null when it is fine. */
export function imageFileError(file: { type: string; size: number }) {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Usa una imagen JPG, PNG o WebP'
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen no puede superar los 5 MB'
  return null
}

/** Scales dimensions down so the longest side is at most `max`, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Reads a file, scales it down in the browser and returns a WebP data URL. */
export async function resizeImageToDataUrl(file: File, max = 1200, quality = 0.82) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/webp', quality)
}

/** The real type of an image, read from its first bytes. The type a file declares proves nothing. */
export function detectImageType(bytes: Uint8Array): (typeof IMAGE_TYPES)[number] | null {
  const startsWith = (signature: readonly number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value)
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // WebP: "RIFF" + size + "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}
