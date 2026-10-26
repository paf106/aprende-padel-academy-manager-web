'use client'

import { ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ds/button'
import { cn } from '@/lib/core/cn'
import { imageFileError, resizeImageToDataUrl } from '@/lib/core/image'

/** Single image field with drag and drop. The image is scaled down in the browser and returned as a data URL. */
export function ImageUpload({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (dataUrl: string) => void
  error?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const problem = imageFileError(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    setLocalError('')
    setBusy(true)
    try {
      onChange(await resizeImageToDataUrl(file))
    } catch {
      setLocalError('No se pudo leer la imagen')
    } finally {
      setBusy(false)
    }
  }

  const message = localError || error
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Subir foto"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Vista previa de la foto" className="aspect-[16/9] w-full object-cover" />
          <div className="flex justify-end gap-2 bg-card p-2">
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
              Cambiar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange('')}>
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void handleFile(event.dataTransfer.files[0])
          }}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-brand bg-brand-soft' : 'border-input hover:border-brand',
          )}
        >
          <ImagePlus size={24} aria-hidden="true" className="text-brand" />
          <span className="text-sm font-medium">
            {busy ? 'Procesando…' : 'Arrastra una foto o haz clic para elegirla'}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG o WebP, hasta 5 MB</span>
        </button>
      )}
      {message ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {message}
        </p>
      ) : null}
    </div>
  )
}
