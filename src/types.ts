/**
 * PWA Station SDK - Type Definitions
 */

/** SQLite query result */
export interface SqliteResult {
  rows: Record<string, any>[] | null
  changes: number
}

/** File entry returned by storage.list() */
export interface FileEntry {
  name: string
  path: string
  size: number
  is_dir: boolean
  mtime: number
}

/** Notification level */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

/** Notification payload */
export interface NotificationPayload {
  title: string
  body?: string
  level?: NotificationLevel
  link?: string
}

/** Scheduler action types */
export type SchedulerActionType = 'notification' | 'open_url' | 'sqlite'

/** Scheduler schedule configuration */
export interface SchedulerSchedule {
  /** 'interval' | 'daily' | 'hourly' */
  type: 'interval' | 'daily' | 'hourly'
  /** Interval in seconds (for type='interval') */
  interval?: number
  /** Time string HH:mm (for type='daily') */
  time?: string
}

/** Scheduler task creation payload */
export interface SchedulerCreatePayload {
  name: string
  type: SchedulerActionType
  schedule: SchedulerSchedule
  /** Action-specific payload */
  payload?: Record<string, any>
  enabled?: boolean
}

/** Scheduler task (with id) */
export interface SchedulerTask extends SchedulerCreatePayload {
  id: number
}

/** SQLite module */
export interface SqliteModule {
  open(db?: string): Promise<{ db: string, path: string }>
  execute(sql: string, params?: any[], db?: string): Promise<SqliteResult>
  batch(sqls: string[], params?: any[][], db?: string): Promise<SqliteResult[]>
}

/** Storage module */
export interface StorageModule {
  upload(path: string, file: Blob | File): Promise<{ path: string, size: number }>
  download(path: string): Promise<Blob>
  list(path?: string, recursive?: boolean): Promise<FileEntry[]>
  remove(path: string): Promise<void>
  mkdir(path: string): Promise<{ path: string }>
  move(from: string, to: string): Promise<{ from: string, to: string }>
}

/** Notifications module */
export interface NotificationsModule {
  send(payload: NotificationPayload): Promise<void>
}

/** Scheduler module */
export interface SchedulerModule {
  create(task: SchedulerCreatePayload): Promise<{ id: number }>
  list(): Promise<SchedulerTask[]>
  update(id: number, task: Partial<SchedulerCreatePayload>): Promise<void>
  remove(id: number): Promise<void>
  runNow(id: number): Promise<void>
}

/**
 * ControllerAPI - main API interface injected by PWA Station.
 *
 * In production: auto-injected via /__controller__/api.js
 * In dev mode: created by createClient() using wa-sqlite + IndexedDB
 */
export interface ControllerAPI {
  debug: boolean
  app: { id: string }
  token: string
  sqlite: SqliteModule
  storage: StorageModule
  notifications: NotificationsModule
  scheduler: SchedulerModule
}

/** Options for creating a client */
export interface CreateClientOptions {
  /** Force debug mode */
  debug?: boolean
}

/** PWA Station global runtime (injected by platform) */
export interface PWAStationGlobal {
  createClient(options?: CreateClientOptions): ControllerAPI
}

declare global {
  interface Window {
    /** Auto-injected by PWA Station in production */
    ControllerAPI?: ControllerAPI
    /** PWA Station runtime for manual client creation */
    PWAStation?: PWAStationGlobal
  }
}
