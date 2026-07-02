import { UnrecoverableError } from 'bullmq'

// Extends BullMQ's UnrecoverableError so the job moves to failed
// immediately without consuming any retry attempts.
export class NonRetryableError extends UnrecoverableError {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

// Signals that a single XML (standalone file or ZIP entry) exceeded the
// per-XML byte cap. Callers record a BatchError and continue the batch,
// rather than failing the whole job.
export class FileTooLargeError extends Error {
  readonly size: number
  constructor(size: number) {
    super(`File exceeds limit at ${size} bytes`)
    this.name = 'FileTooLargeError'
    this.size = size
  }
}
