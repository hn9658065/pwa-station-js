/**
 * PWA Station SDK - Framework-agnostic core.
 *
 * @example
 * ```ts
 * import { createClient, getAPI } from 'pwa-station'
 *
 * await createClient()
 * const api = getAPI()
 * await api.sqlite.execute('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)')
 * ```
 */
export { createClient, getAPI, resetClient } from './client'

export type {
  ControllerAPI,
  CreateClientOptions,
  SqliteModule,
  SqliteResult,
  StorageModule,
  FileEntry,
  NotificationsModule,
  NotificationPayload,
  NotificationLevel,
  SchedulerModule,
  SchedulerCreatePayload,
  SchedulerTask,
  SchedulerSchedule,
  SchedulerActionType,
} from './types'
