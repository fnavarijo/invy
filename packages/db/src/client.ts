import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema.ts'

export type DB = PostgresJsDatabase<typeof schema>

export interface DbClientOptions {
  max?: number
  idle_timeout?: number
  connect_timeout?: number
}

export interface DbClient {
  db: DB
  client: ReturnType<typeof postgres>
}

export function createDb(
  databaseUrl: string,
  options: DbClientOptions = {},
): DbClient {
  const { max = 10, idle_timeout = 30, connect_timeout = 10 } = options

  const client = postgres(databaseUrl, { max, idle_timeout, connect_timeout })
  const db = drizzle(client, { schema })

  return { db, client }
}
