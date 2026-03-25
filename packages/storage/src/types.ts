import type { Readable } from 'node:stream'

export interface StorageConfig {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  forcePathStyle?: boolean
}

export interface UploadOptions {
  key: string
  body: Readable
  contentType: string
}

export interface UploadHandle {
  done(): Promise<void>
  abort(): Promise<void>
}

export interface StorageClient {
  createUpload(options: UploadOptions): UploadHandle
  delete(key: string): Promise<void>
  getStream(key: string): Promise<Readable>
}

export interface StorageInstance {
  storage: StorageClient
  destroy(): void
}

export class StorageError extends Error {
  readonly code: string
  readonly cause: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.cause = cause
  }
}
