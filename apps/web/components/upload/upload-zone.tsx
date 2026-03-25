"use client"

import * as React from "react"
import { UploadCloud, FileArchive, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

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
  const inputRef = React.useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setError(null)

    const accepted: UploadedFile[] = []
    for (const file of Array.from(incoming)) {
      if (!isAccepted(file)) {
        setError(`"${file.name}" is not a supported file type. Please upload .xml or .zip files.`)
        continue
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${MAX_SIZE_MB} MB limit.`)
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

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload XML or ZIP invoice file. Press Enter or Space to browse, or drag and drop a file here."
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
      >
        <UploadCloud
          className={cn("size-10 transition-colors", dragging ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Drop your file here, or{" "}
            <span className="text-primary underline underline-offset-2">browse</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .xml and .zip — up to {MAX_SIZE_MB} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(",")}
          multiple
          className="sr-only"
          aria-hidden
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
        <ul className="space-y-2" aria-label="Files to upload">
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
              <span className="shrink-0 text-xs text-muted-foreground">{humanSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => removeFile(id)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Submit */}
      {files.length > 0 && (
        <Button className="w-full sm:w-auto">
          Process {files.length === 1 ? "file" : `${files.length} files`}
        </Button>
      )}
    </div>
  )
}
