import { UnrecoverableError } from 'bullmq'

// Extends BullMQ's UnrecoverableError so the job moves to failed
// immediately without consuming any retry attempts.
export class NonRetryableError extends UnrecoverableError {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableError'
  }
}
