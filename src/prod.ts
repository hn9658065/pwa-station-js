/**
 * PWA Station SDK - Production-only entry.
 *
 * This entry does NOT include debug fallback code. It only resolves the
 * ControllerAPI from `window.ControllerAPI` or `window.PWAStation.createClient()`.
 * Use this in production builds where wa-sqlite wasm should never be loaded.
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
export { createClient, getAPI, resetClient } from './prod-client'

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
