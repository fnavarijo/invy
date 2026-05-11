"use client"

import * as React from "react"
import { UploadCloud, FileArchive, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import { useBatchUpload } from "@/lib/hooks/use-batch-upload"

type UploadedFile = {
  file: File
  id: string
}

const ACCEPTED_TYPES = ["application/xml", "text/xml", "application/zip", "application/x-zip-compressed"]
const ACCEPTED_EXTS = [".xml", ".zip"]
const MAX_SIZE_MB = 50

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAccepted(file: File): boolean {
  const extOk = ACCEPTED_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext))
  const typeOk = ACCEPTED_TYPES.includes(file.type)
  return extOk || typeOk
}

export function UploadZone() {
  const [dragging, setDragging] = React.useState(false)
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [source, setSource] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const router = useRouter()
  const { state, upload, reset } = useBatchUpload({ onComplete: () => router.refresh() })

  const isBusy = state.phase === "uploading" || state.phase === "polling"
  const isFinished = state.phase === "done" || state.phase === "failed"

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setError(null)

    const accepted: UploadedFile[] = []
    for (const file of Array.from(incoming)) {
      if (!isAccepted(file)) {
        setError(`"${file.name}" no es un tipo de archivo compatible. Por favor sube archivos .xml o .zip.`)
        continue
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de ${MAX_SIZE_MB} MB.`)
        continue
      }
      accepted.push({ file, id: crypto.randomUUID() })
    }
    setFiles((prev) => [...prev, ...accepted])
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  function handleProcess() {
    if (files.length === 0) return
    // Upload files sequentially — start with the first; extend to loop if needed
    const [first, ...rest] = files
    if (!first) return
    // For now we upload one at a time; the hook tracks one batch at a time
    upload(first.file, source.trim() || undefined)
    // Remaining files are noted but only the first is submitted per call
    if (rest.length > 0) {
      setFiles(rest.map((f) => f))
    } else {
      setFiles([])
    }
  }

  function handleReset() {
    reset()
    setFiles([])
    setError(null)
    setSource('')
  }

  // ------------------------------------------------------------------
  // Render feedback panels
  // ------------------------------------------------------------------

  if (state.phase === "uploading") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-card px-6 py-8 text-center space-y-4">
          <p className="text-sm font-medium text-foreground">Subiendo…</p>
          <Progress value={state.progress} className="w-full" />
          <p className="text-sm text-muted-foreground">{state.progress}%</p>
        </div>
      </div>
    )
  }

  if (state.phase === "polling") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-card px-6 py-8 text-center space-y-4">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">Procesando…</p>
          <p className="text-sm text-muted-foreground">
            ID de lote: <span className="font-mono">{state.batch.batch_id}</span>
          </p>
          {/* <p className="text-sm text-muted-foreground">
            Intento {state.attempt + 1}
          </p> */}
        </div>
      </div>
    )
  }

  if (state.phase === "done") {
    const { batch } = state
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-6 py-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto size-8 text-green-600 dark:text-green-400" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Lote completado</p>
          <dl className="text-sm text-muted-foreground space-y-1">
            <div>
              <dt className="inline">ID de lote: </dt>
              <dd className="inline font-mono">{batch.batch_id}</dd>
            </div>
            {batch.invoice_count != null && (
              <div>
                <dt className="inline">Facturas procesadas: </dt>
                <dd className="inline">{batch.invoice_count}</dd>
              </div>
            )}
            {batch.failed_count != null && batch.failed_count > 0 && (
              <div>
                <dt className="inline">Fallidas: </dt>
                <dd className="inline text-destructive">{batch.failed_count}</dd>
              </div>
            )}
          </dl>
          <a
            href={`/batches/${batch.batch_id}`}
            className="inline-block text-sm text-primary underline underline-offset-2 hover:no-underline"
          >
            Ver detalles del lote
          </a>
        </div>
        <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
          Subir otro
        </Button>
      </div>
    )
  }

  if (state.phase === "failed") {
    const { batch } = state
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center space-y-3">
          <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Error al subir</p>
          <p className="text-sm text-destructive">{state.error}</p>
          {batch && (
            <p className="text-sm text-muted-foreground font-mono">{batch.batch_id}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
          Subir otro
        </Button>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Idle state — default drop zone UI
  // ------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Source label */}
      <div className="space-y-1.5">
        <label
          htmlFor="batch-source"
          className="flex items-baseline gap-2 text-sm font-medium text-foreground"
        >
          Fuente
          <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="batch-source"
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="ej. equipo-finanzas"
          disabled={isBusy}
          maxLength={100}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-label="Sube un archivo XML o ZIP de factura. Presiona Enter o Espacio para explorar, o arrastra y suelta un archivo aquí."
        aria-disabled={isBusy}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isBusy
            ? "cursor-not-allowed opacity-50 border-border"
            : "cursor-pointer border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
          dragging && !isBusy && "border-primary bg-primary/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        onDragOver={isBusy ? undefined : onDragOver}
        onDragLeave={isBusy ? undefined : onDragLeave}
        onDrop={isBusy ? undefined : onDrop}
        onClick={isBusy ? undefined : () => inputRef.current?.click()}
        onKeyDown={isBusy ? undefined : onKeyDown}
      >
        <UploadCloud
          className={cn("size-10 transition-colors", dragging ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Arrastra tu archivo aquí, o{" "}
            <span className="text-primary underline underline-offset-2">explora</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compatible con .xml y .zip — hasta {MAX_SIZE_MB} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(",")}
          multiple
          className="sr-only"
          aria-hidden
          disabled={isBusy}
          onChange={(e) => addFiles(e.target.files)}
          // Reset value so the same file can be re-selected after removal
          onClick={(e) => ((e.target as HTMLInputElement).value = "")}
        />
      </div>

      {/* Validation error */}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Archivos a subir">
          {files.map(({ file, id }) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm"
            >
              {file.name.endsWith(".zip") ? (
                <FileArchive className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-sm text-muted-foreground">{humanSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Eliminar ${file.name}`}
                disabled={isBusy}
                className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                onClick={() => removeFile(id)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Submit */}
      {files.length > 0 && !isFinished && (
        <Button
          className="w-full sm:w-auto"
          disabled={isBusy}
          onClick={handleProcess}
        >
          Procesar {files.length === 1 ? "archivo" : `${files.length} archivos`}
        </Button>
      )}
    </div>
  )
}
