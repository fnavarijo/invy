import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Readable } from 'node:stream'
import {
  StorageError,
  type StorageConfig,
  type StorageClient,
  type StorageInstance,
  type UploadOptions,
  type UploadHandle,
} from './types.js'

export function createStorage(config: StorageConfig): StorageInstance {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? false,
  })

  function createUpload(options: UploadOptions): UploadHandle {
    const upload = new Upload({
      client,
      params: {
        Bucket: config.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
      },
    })

    return {
      done: async () => {
        try {
          await upload.done()
        } catch (err) {
          throw new StorageError('UPLOAD_FAILED', `Failed to upload "${options.key}"`, err)
        }
      },
      abort: () => upload.abort(),
    }
  }

  async function deleteObject(key: string): Promise<void> {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    } catch (err) {
      throw new StorageError('DELETE_FAILED', `Failed to delete "${key}"`, err)
    }
  }

  async function getStream(key: string): Promise<Readable> {
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
      if (!response.Body) {
        throw new StorageError('NOT_FOUND', `No body returned for key "${key}"`)
      }
      return response.Body as unknown as Readable
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageError('GET_FAILED', `Failed to get "${key}"`, err)
    }
  }

  const storage: StorageClient = {
    createUpload,
    delete: deleteObject,
    getStream,
  }

  return {
    storage,
    destroy: () => client.destroy(),
  }
}
